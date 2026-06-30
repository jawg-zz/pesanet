import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  validateKePhone,
  normaliseKePhone,
  generateFakeIP,
  generateFakeMAC,
} from "@/lib/wifi-utils";
import { awardPoints, processReferralCompletion, isBlacklisted } from "@/lib/loyalty";
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

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { code, phone } = body || {};

    if (!code || !phone) {
      return NextResponse.json(
        { error: "Missing code or phone" },
        { status: 400 }
      );
    }

    if (!validateKePhone(String(phone))) {
      return NextResponse.json(
        { error: "Invalid phone number" },
        { status: 400 }
      );
    }

    const normalisedPhone = normaliseKePhone(String(phone));
    const codeUpper = String(code).toUpperCase();

    // Block blacklisted phones from redeeming.
    if (await isBlacklisted(normalisedPhone)) {
      return NextResponse.json(
        { error: "This number is blocked. Contact support." },
        { status: 403 }
      );
    }

    const voucher = await db.voucher.findUnique({ where: { code: codeUpper } });
    if (!voucher) {
      return NextResponse.json(
        { error: "Invalid voucher code" },
        { status: 400 }
      );
    }

    if (voucher.status !== "unused") {
      return NextResponse.json(
        { error: "This voucher has already been used" },
        { status: 400 }
      );
    }

    const customer = await db.customer.upsert({
      where: { phone: normalisedPhone },
      update: {},
      create: { phone: normalisedPhone },
    });

    const now = new Date();
    const pkg = await db.package.findUnique({ where: { id: voucher.packageId } });

    // Update voucher to used
    await db.voucher.update({
      where: { id: voucher.id },
      data: {
        status: "used",
        usedBy: normalisedPhone,
        usedAt: now,
      },
    });

    // Create transaction
    const transaction = await db.transaction.create({
      data: {
        customerId: customer.id,
        phone: normalisedPhone,
        amountKES: voucher.priceKES,
        packageId: voucher.packageId,
        packageName: voucher.packageName,
        method: "voucher",
        status: "completed",
      },
    });

    // Create session — duration from package (fallback 60 min)
    const sessionDuration = pkg?.durationMinutes ?? 60;
    const endTime = new Date(now.getTime() + sessionDuration * 60 * 1000);

    // Tag the session to a hotspot site: pick the first active site,
    // or fall back to a random site if none are active.
    let siteId: string | undefined;
    const firstActive = await db.hotspotSite.findFirst({
      where: { status: "active" },
      select: { id: true },
    });
    if (firstActive) {
      siteId = firstActive.id;
    } else {
      const anySite = await db.hotspotSite.findFirst({
        select: { id: true },
      });
      if (anySite) siteId = anySite.id;
    }

    const session = await db.session.create({
      data: {
        customerId: customer.id,
        packageId: voucher.packageId,
        phone: normalisedPhone,
        packageName: voucher.packageName,
        priceKES: voucher.priceKES,
        startTime: now,
        endTime,
        durationMinutes: sessionDuration,
        status: "active",
        authMethod: "voucher",
        ipAddress: generateFakeIP(),
        macAddress: generateFakeMAC(),
        ...(siteId ? { siteId } : {}),
      },
      include: {
        customer: { select: { name: true } },
        site: { select: { name: true } },
        feedback: { select: { id: true } },
      },
    });

    // silence unused var lint
    void transaction;

    // Award loyalty points (same as M-Pesa: 1 pt / KES paid).
    // Voucher redemptions use voucher.priceKES as the qualifying spend.
    try {
      const points = voucher.priceKES;
      if (points > 0) {
        await awardPoints(
          customer.id,
          points,
          "earn_purchase",
          `Purchase: ${voucher.packageName}`,
          transaction.id
        );
      }
      // Complete any pending referral for this customer.
      await processReferralCompletion(customer.id, normalisedPhone);
    } catch (e) {
      console.error("Failed to award loyalty points on voucher redeem:", e);
    }

    // Provision the connection on the real network backend.
    try {
      const { getNetworkProvider } = await import("@/lib/network-provider")
      const provider = await getNetworkProvider(siteId)
      void provider.activate({
        username: normalisedPhone,
        password: normalisedPhone,
        timeoutMinutes: sessionDuration,
        downloadMbps: pkg?.downloadSpeedMbps ?? 0,
        uploadMbps: pkg?.uploadSpeedMbps ?? 0,
        mac: session.macAddress ?? undefined,
        sessionId: session.id,
        phone: normalisedPhone,
      })
    } catch (e) {
      console.error("Network backend activate (voucher) failed:", e)
    }

    return NextResponse.json({
      success: true,
      sessionId: session.id,
      session: mapSession(session),
      message: "Voucher redeemed! You are now connected.",
    });
  } catch (err) {
    console.error("POST /api/vouchers/redeem error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
