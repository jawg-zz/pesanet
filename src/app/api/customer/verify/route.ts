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

    const customer = await db.customer.findUnique({
      where: { phone: normalisedPhone },
    });

    if (!customer) {
      return NextResponse.json(
        { error: "No account found for this number" },
        { status: 404 }
      );
    }

    const now = Date.now();
    const expired =
      !customer.otpExpires || customer.otpExpires.getTime() < now;

    if (!customer.otpCode || customer.otpCode !== String(otp) || expired) {
      return NextResponse.json(
        { error: "Invalid or expired OTP" },
        { status: 401 }
      );
    }

    await db.customer.update({
      where: { id: customer.id },
      data: { otpCode: null, otpExpires: null },
    });

    return NextResponse.json({
      success: true,
      customerId: customer.id,
      phone: customer.phone,
      name: customer.name,
    });
  } catch (err) {
    console.error("POST /api/customer/verify error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
