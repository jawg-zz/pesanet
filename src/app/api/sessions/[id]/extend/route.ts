import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { generateMpesaRef, formatDuration } from "@/lib/wifi-utils";
import type { WifiSession } from "@/lib/types";

export const dynamic = "force-dynamic";

function mapSession(s: any): WifiSession {
  return {
    id: s.id,
    phone: s.phone,
    packageName: s.packageName,
    priceKES: s.priceKES,
    startTime: s.startTime,
    endTime: s.endTime,
    durationMinutes: s.durationMinutes,
    status: s.status,
    dataUsedMB: s.dataUsedMB,
    ipAddress: s.ipAddress,
    macAddress: s.macAddress,
    authMethod: s.authMethod,
    mpesaRef: s.mpesaRef,
    promoCode: s.promoCode ?? null,
    discountKES: s.discountKES ?? 0,
    siteId: s.siteId ?? null,
    siteName: s.site?.name ?? null,
    extended: s.extended ?? false,
    hasFeedback: !!s.feedback,
    customer: s.customer ? { name: s.customer.name } : null,
  };
}

interface PromoValidation {
  valid: boolean;
  discountKES: number;
  finalAmountKES: number;
  promoId?: string;
  code?: string;
}

/** Validate a promo code against an amount, returning the discount + final amount. */
async function validatePromo(
  rawCode: string,
  amountKES: number
): Promise<PromoValidation> {
  const code = String(rawCode).toUpperCase().trim();
  const promo = await db.promoCode.findUnique({ where: { code } });

  if (!promo || !promo.active) {
    return { valid: false, discountKES: 0, finalAmountKES: amountKES };
  }
  if (promo.expiresAt && promo.expiresAt.getTime() < Date.now()) {
    return { valid: false, discountKES: 0, finalAmountKES: amountKES };
  }
  if (promo.maxUses > 0 && promo.usesCount >= promo.maxUses) {
    return { valid: false, discountKES: 0, finalAmountKES: amountKES };
  }

  let discountKES = 0;
  if (promo.discountType === "percent") {
    discountKES = Math.round((amountKES * promo.discountValue) / 100);
  } else if (promo.discountType === "fixed") {
    discountKES = Math.min(promo.discountValue, amountKES);
  }

  return {
    valid: true,
    discountKES,
    finalAmountKES: Math.max(0, amountKES - discountKES),
    promoId: promo.id,
    code: promo.code,
  };
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { packageId, promoCode } = body || {};

    if (!packageId || typeof packageId !== "string") {
      return NextResponse.json(
        { error: "Missing packageId" },
        { status: 400 }
      );
    }

    const session = await db.session.findUnique({ where: { id } });
    if (!session) {
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 }
      );
    }

    if (session.status !== "active") {
      return NextResponse.json(
        { error: "Only active sessions can be extended" },
        { status: 400 }
      );
    }

    const pkg = await db.package.findUnique({
      where: { id: String(packageId) },
    });
    if (!pkg || !pkg.active) {
      return NextResponse.json(
        { error: "Package not found or inactive" },
        { status: 400 }
      );
    }

    // Promo validation (if provided).
    let promo: PromoValidation | null = null;
    if (promoCode && String(promoCode).trim().length > 0) {
      promo = await validatePromo(String(promoCode), pkg.priceKES);
      if (!promo.valid) {
        return NextResponse.json(
          { error: "Invalid or expired promo code" },
          { status: 400 }
        );
      }
    }

    const finalAmount = promo ? promo.finalAmountKES : pkg.priceKES;
    const discountKES = promo?.discountKES ?? 0;
    const mpesaRef = generateMpesaRef();

    // Record the top-up as a completed M-Pesa transaction.
    const transactionData: any = {
      phone: session.phone,
      amountKES: finalAmount,
      packageId: pkg.id,
      packageName: pkg.name,
      method: "mpesa",
      status: "completed",
      mpesaRef,
      promoCode: promo?.code ?? null,
      discountKES,
    };
    if (session.customerId) transactionData.customerId = session.customerId;

    await db.transaction.create({ data: transactionData });

    // Extend the session end time by the package duration.
    const newEndTime = new Date(
      session.endTime.getTime() + pkg.durationMinutes * 60 * 1000
    );
    const newDurationMinutes = session.durationMinutes + pkg.durationMinutes;

    const updated = await db.session.update({
      where: { id: session.id },
      data: {
        endTime: newEndTime,
        durationMinutes: newDurationMinutes,
        extended: true,
      },
      include: {
        customer: { select: { name: true } },
        site: { select: { name: true } },
        feedback: { select: { id: true } },
      },
    });

    // Increment promo usage counter if one was used.
    if (promo?.promoId) {
      try {
        await db.promoCode.update({
          where: { id: promo.promoId },
          data: { usesCount: { increment: 1 } },
        });
      } catch (e) {
        console.error("Failed to increment promo usesCount:", e);
      }
    }

    // Tell the network backend to extend the live session-timeout.
    try {
      const { getNetworkProvider } = await import("@/lib/network-provider")
      const provider = await getNetworkProvider(session.siteId)
      void provider.extend(session.phone, pkg.durationMinutes, session.id, session.phone)
    } catch (e) {
      console.error("Network backend extend failed:", e)
    }

    const message = `Session extended by ${formatDuration(
      pkg.durationMinutes
    )}. New expiry: ${newEndTime.toISOString()}`;

    return NextResponse.json({
      session: mapSession(updated),
      mpesaRef,
      message,
    });
  } catch (err) {
    console.error("POST /api/sessions/[id]/extend error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
