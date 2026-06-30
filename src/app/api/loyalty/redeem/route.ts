import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  normaliseKePhone,
  validateKePhone,
  pointsCostForPackage,
  generateVoucherCode,
} from "@/lib/wifi-utils";
import type { WifiVoucher } from "@/lib/types";

export const dynamic = "force-dynamic";

function mapVoucher(v: any): WifiVoucher {
  return {
    id: v.id,
    code: v.code,
    packageName: v.packageName,
    priceKES: v.priceKES,
    status: v.status,
    usedBy: v.usedBy ?? null,
    usedAt: v.usedAt ?? null,
    resellerId: v.resellerId ?? null,
    createdAt: v.createdAt,
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

    const customer = await db.customer.findUnique({
      where: { phone: normalisedPhone },
    });
    if (!customer) {
      return NextResponse.json(
        { error: "Customer not found" },
        { status: 404 }
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

    const pointsCost = pointsCostForPackage(pkg.priceKES);

    if ((customer.pointsBalance ?? 0) < pointsCost) {
      return NextResponse.json(
        {
          error: "Insufficient points",
          pointsBalance: customer.pointsBalance ?? 0,
          pointsCost,
        },
        { status: 400 }
      );
    }

    // Deduct pointsBalance (lifetimePoints stays untouched on redemption).
    const newBalance = (customer.pointsBalance ?? 0) - pointsCost;
    const [updatedCustomer, voucher, ledger] = await Promise.all([
      db.customer.update({
        where: { id: customer.id },
        data: { pointsBalance: newBalance },
      }),
      db.voucher.create({
        data: {
          code: generateVoucherCode(),
          packageId: pkg.id,
          packageName: pkg.name,
          priceKES: pkg.priceKES,
          status: "unused",
          batchId: `LOYALTY-${Date.now()}`,
        },
      }),
      db.pointsTransaction.create({
        data: {
          customerId: customer.id,
          points: -pointsCost,
          type: "redeem_voucher",
          reason: `Redeemed voucher: ${pkg.name}`,
          referenceId: null,
        },
      }),
    ]);

    // silence unused var lint
    void ledger;

    return NextResponse.json({
      voucher: mapVoucher(voucher),
      pointsBalance: updatedCustomer.pointsBalance ?? 0,
      message: `Voucher ${voucher.code} redeemed for ${pointsCost} points.`,
    });
  } catch (err) {
    console.error("POST /api/loyalty/redeem error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
