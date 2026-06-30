import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { normaliseKePhone } from "@/lib/wifi-utils";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { phone, otp } = body || {};

    if (!phone || !otp) {
      return NextResponse.json(
        { error: "Missing phone or otp" },
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

    const now = Date.now();
    const expired =
      !reseller.otpExpires || reseller.otpExpires.getTime() < now;

    if (!reseller.otpCode || reseller.otpCode !== String(otp) || expired) {
      return NextResponse.json(
        { error: "Invalid or expired OTP" },
        { status: 401 }
      );
    }

    // Clear the OTP
    await db.reseller.update({
      where: { id: reseller.id },
      data: { otpCode: null, otpExpires: null },
    });

    return NextResponse.json({
      success: true,
      resellerId: reseller.id,
      name: reseller.name,
      phone: reseller.phone,
    });
  } catch (err) {
    console.error("POST /api/reseller/verify error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
