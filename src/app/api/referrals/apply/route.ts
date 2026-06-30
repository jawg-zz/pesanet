import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  validateKePhone,
  normaliseKePhone,
} from "@/lib/wifi-utils";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { phone, referralCode } = body || {};

    if (!phone || !referralCode) {
      return NextResponse.json(
        { error: "Missing phone or referralCode" },
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

    // Lookup the customer applying the code.
    const customer = await db.customer.findUnique({
      where: { phone: normalisedPhone },
    });
    if (!customer) {
      return NextResponse.json(
        { error: "Customer not found" },
        { status: 404 }
      );
    }

    // Case-insensitive lookup of the referrer by referralCode.
    // SQLite doesn't support mode: "insensitive" — emulate with a lower-cased findMany.
    const codeTrim = String(referralCode).trim().toLowerCase();
    if (!codeTrim) {
      return NextResponse.json(
        { error: "Invalid referral code" },
        { status: 400 }
      );
    }

    const candidates = await db.customer.findMany({
      where: { referralCode: { not: null } },
      select: { id: true, referralCode: true, phone: true },
    });
    const referrer = candidates.find(
      (c) => (c.referralCode ?? "").toLowerCase() === codeTrim
    );
    if (!referrer) {
      return NextResponse.json(
        { error: "Referral code not found" },
        { status: 400 }
      );
    }

    if (referrer.id === customer.id) {
      return NextResponse.json(
        { error: "You cannot refer yourself" },
        { status: 400 }
      );
    }

    // Has this customer already been referred by someone?
    const existing = await db.referral.findFirst({
      where: { referredCustomerId: customer.id },
    });
    if (existing) {
      return NextResponse.json(
        { error: "This customer has already been referred" },
        { status: 400 }
      );
    }

    await db.referral.create({
      data: {
        referrerCustomerId: referrer.id,
        referredCustomerId: customer.id,
        referredPhone: normalisedPhone,
        status: "pending",
        rewardPoints: 0,
      },
    });

    return NextResponse.json({
      success: true,
      message:
        "Referral applied! You and your referrer will be rewarded after your first purchase.",
    });
  } catch (err) {
    console.error("POST /api/referrals/apply error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
