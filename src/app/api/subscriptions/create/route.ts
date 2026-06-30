import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  validateKePhone,
  normaliseKePhone,
} from "@/lib/wifi-utils";
import { isBlacklisted } from "@/lib/loyalty";
import type { SubscriptionEntry } from "@/lib/types";

export const dynamic = "force-dynamic";

function mapSubscription(s: any): SubscriptionEntry {
  return {
    id: s.id,
    phone: s.phone,
    packageName: s.packageName,
    priceKES: s.priceKES,
    status: s.status,
    nextChargeAt: s.nextChargeAt,
    lastChargedAt: s.lastChargedAt ?? null,
    customerName: s.customer?.name ?? null,
    createdAt: s.createdAt,
  };
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { phone, packageId } = body || {};

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

    const normalisedPhone = normaliseKePhone(String(phone));

    // Block blacklisted phones from creating subscriptions.
    if (await isBlacklisted(normalisedPhone)) {
      return NextResponse.json(
        { error: "This number is blocked. Contact support." },
        { status: 403 }
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

    const customer = await db.customer.upsert({
      where: { phone: normalisedPhone },
      update: {},
      create: { phone: normalisedPhone },
    });

    const now = new Date();
    const nextChargeAt = new Date(
      now.getTime() + pkg.durationMinutes * 60 * 1000
    );

    const subscription = await db.subscription.create({
      data: {
        customerId: customer.id,
        phone: normalisedPhone,
        packageId: pkg.id,
        packageName: pkg.name,
        priceKES: pkg.priceKES,
        status: "active",
        nextChargeAt,
      },
      include: {
        customer: { select: { name: true } },
      },
    });

    return NextResponse.json({
      subscription: mapSubscription(subscription),
      message: `Auto-renew subscription activated for ${pkg.name}. Next charge: KES ${pkg.priceKES} on ${nextChargeAt.toLocaleString("en-KE")}.`,
    });
  } catch (err) {
    console.error("POST /api/subscriptions/create error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
