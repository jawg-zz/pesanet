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

    const customer = await db.customer.findUnique({
      where: { phone: normalisedPhone },
    });

    if (!customer) {
      return NextResponse.json(
        {
          error:
            "No account found for this number. Buy a package first to create your account.",
        },
        { status: 404 }
      );
    }

    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    const expires = new Date(Date.now() + 5 * 60 * 1000);

    await db.customer.update({
      where: { id: customer.id },
      data: { otpCode: otp, otpExpires: expires },
    });

    return NextResponse.json({
      otp,
      message: `Demo OTP: use ${otp}`,
    });
  } catch (err) {
    console.error("POST /api/customer/otp error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
