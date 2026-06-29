import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { validateKePhone, normaliseKePhone } from "@/lib/wifi-utils";

export const dynamic = "force-dynamic";

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

    const pkg = await db.package.findUnique({ where: { id: String(packageId) } });
    if (!pkg || !pkg.active) {
      return NextResponse.json(
        { error: "Package not found or inactive" },
        { status: 400 }
      );
    }

    const normalisedPhone = normaliseKePhone(String(phone));

    const customer = await db.customer.upsert({
      where: { phone: normalisedPhone },
      update: {},
      create: { phone: normalisedPhone },
    });

    const transaction = await db.transaction.create({
      data: {
        customerId: customer.id,
        phone: normalisedPhone,
        amountKES: pkg.priceKES,
        packageId: pkg.id,
        packageName: pkg.name,
        method: "mpesa",
        status: "pending",
      },
    });

    return NextResponse.json({
      transactionId: transaction.id,
      status: "pending",
      message: `STK push sent to ${normalisedPhone}. Enter your M-Pesa PIN to complete.`,
    });
  } catch (err) {
    console.error("POST /api/mpesa/stk error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
