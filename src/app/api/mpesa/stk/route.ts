import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { validateKePhone, normaliseKePhone } from "@/lib/wifi-utils";
import { isBlacklisted } from "@/lib/loyalty";

export const dynamic = "force-dynamic";

interface PromoValidation {
  valid: boolean;
  discountKES: number;
  finalAmountKES: number;
  message: string;
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
    return {
      valid: false,
      discountKES: 0,
      finalAmountKES: amountKES,
      message: "Invalid promo code",
    };
  }

  if (promo.expiresAt && promo.expiresAt.getTime() < Date.now()) {
    return {
      valid: false,
      discountKES: 0,
      finalAmountKES: amountKES,
      message: "This promo code has expired",
    };
  }

  if (promo.maxUses > 0 && promo.usesCount >= promo.maxUses) {
    return {
      valid: false,
      discountKES: 0,
      finalAmountKES: amountKES,
      message: "Promo code usage limit reached",
    };
  }

  let discountKES = 0;
  if (promo.discountType === "percent") {
    discountKES = Math.round((amountKES * promo.discountValue) / 100);
  } else if (promo.discountType === "fixed") {
    discountKES = Math.min(promo.discountValue, amountKES);
  }

  const finalAmountKES = Math.max(0, amountKES - discountKES);

  return {
    valid: true,
    discountKES,
    finalAmountKES,
    message: `Promo applied: ${promo.description}`,
    promoId: promo.id,
    code: promo.code,
  };
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { phone, packageId, promoCode } = body || {};

    if (!phone || !packageId) {
      return NextResponse.json(
        { error: "Missing phone or packageId" },
        { status: 400 }
      );
    }

    if (!validateKePhone(String(phone))) {
      return NextResponse.json(
        { error: "Invalid phone number" },
        { status: 400 }
      );
    }

    const pkg = await db.package.findUnique({ where: { id: String(packageId) } });
    if (!pkg || !pkg.active) {
      return NextResponse.json(
        { error: "Package not found or inactive" },
        { status: 400 }
      );
    }

    const normalisedPhone = normaliseKePhone(String(phone));

    // Block blacklisted phones from purchasing.
    if (await isBlacklisted(normalisedPhone)) {
      return NextResponse.json(
        { error: "This number is blocked. Contact support." },
        { status: 403 }
      );
    }

    // Validate promo code if provided
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

    const chargedAmount = promo ? promo.finalAmountKES : pkg.priceKES;

    const customer = await db.customer.upsert({
      where: { phone: normalisedPhone },
      update: {},
      create: { phone: normalisedPhone },
    });

    const transaction = await db.transaction.create({
      data: {
        customerId: customer.id,
        phone: normalisedPhone,
        amountKES: chargedAmount,
        packageId: pkg.id,
        packageName: pkg.name,
        method: "mpesa",
        status: "pending",
        promoCode: promo?.code ?? null,
        discountKES: promo?.discountKES ?? 0,
      },
    });

    const message = promo
      ? `STK push sent to ${normalisedPhone} for KES ${chargedAmount} (discount KES ${promo.discountKES} applied). Enter your M-Pesa PIN to complete.`
      : `STK push sent to ${normalisedPhone}. Enter your M-Pesa PIN to complete.`;

    return NextResponse.json({
      transactionId: transaction.id,
      status: "pending",
      message,
    });
  } catch (err) {
    console.error("POST /api/mpesa/stk error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
