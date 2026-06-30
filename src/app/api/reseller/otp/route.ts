import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { normaliseKePhone } from "@/lib/wifi-utils";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { phone } = body || {};

    if (!phone) {
      return NextResponse.json(
        { error: "Missing phone number" },
        { status: 400 }
      );
    }

    const normalisedPhone = normaliseKePhone(String(phone));

    const reseller = await db.reseller.findUnique({
      where: { phone: normalisedPhone },
    });

    if (!reseller) {
      return NextResponse.json(
        { error: "No reseller account found for this phone number" },
        { status: 404 }
      );
    }

    if (reseller.status === "suspended") {
      return NextResponse.json(
        { error: "Your reseller account is suspended. Contact support." },
        { status: 403 }
      );
    }

    // Generate a 4-digit OTP
    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    const expires = new Date(Date.now() + 5 * 60 * 1000);

    await db.reseller.update({
      where: { id: reseller.id },
      data: { otpCode: otp, otpExpires: expires },
    });

    return NextResponse.json({
      otp,
      message: `Demo OTP: use ${otp} to sign in`,
    });
  } catch (err) {
    console.error("POST /api/reseller/otp error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
