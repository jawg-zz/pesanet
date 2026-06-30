import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { normaliseKePhone, generateVoucherCode } from "@/lib/wifi-utils";
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
    usedAt: v.usedAt ? v.usedAt.toISOString() : null,
    resellerId: v.resellerId ?? null,
    createdAt: v.createdAt.toISOString(),
  };
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { phone, packageId, count: rawCount } = body || {};

    if (!phone || !packageId) {
      return NextResponse.json(
        { error: "Missing phone or packageId" },
        { status: 400 }
      );
    }

    const normalisedPhone = normaliseKePhone(String(phone));

    const reseller = await db.reseller.findUnique({
      where: { phone: normalisedPhone },
    });

    if (!reseller) {
      return NextResponse.json(
        { error: "Reseller not found" },
        { status: 404 }
      );
    }

    if (reseller.status === "suspended") {
      return NextResponse.json(
        { error: "Your reseller account is suspended. Contact support." },
        { status: 403 }
      );
    }

    const pkg = await db.package.findUnique({ where: { id: String(packageId) } });
    if (!pkg || !pkg.active) {
      return NextResponse.json(
        { error: "Package not found or inactive" },
        { status: 400 }
      );
    }

    let count = Number(rawCount);
    if (!Number.isFinite(count)) count = 5;
    count = Math.max(1, Math.min(50, Math.floor(count)));

    // unitCost = round(price * (1 - commission/100))
    const unitCost = Math.round(
      pkg.priceKES * (1 - reseller.commissionRate / 100)
    );
    const totalCost = unitCost * count;

    if (reseller.walletBalanceKES < totalCost) {
      return NextResponse.json(
        {
          error: `Insufficient wallet balance. Needed KES ${totalCost}, have KES ${reseller.walletBalanceKES}.`,
        },
        { status: 400 }
      );
    }

    const commission = (pkg.priceKES - unitCost) * count;

    const batchId = `RESELLER-${Date.now()}`;
    const createdVouchers: any[] = [];

    // Deduct from wallet, add commission to totalEarnedKES, add totalCost to totalSalesKES
    const updatedReseller = await db.reseller.update({
      where: { id: reseller.id },
      data: {
        walletBalanceKES: reseller.walletBalanceKES - totalCost,
        totalEarnedKES: reseller.totalEarnedKES + commission,
        totalSalesKES: reseller.totalSalesKES + totalCost,
      },
    });

    // Create `count` vouchers
    for (let i = 0; i < count; i++) {
      let code = generateVoucherCode();
      let exists = await db.voucher.findUnique({ where: { code } });
      while (exists) {
        code = generateVoucherCode();
        exists = await db.voucher.findUnique({ where: { code } });
      }
      const v = await db.voucher.create({
        data: {
          code,
          packageId: pkg.id,
          packageName: pkg.name,
          priceKES: pkg.priceKES,
          status: "unused",
          batchId,
          resellerId: reseller.id,
        },
      });
      createdVouchers.push(v);
    }

    // Create a Transaction
    await db.transaction.create({
      data: {
        phone: reseller.phone,
        amountKES: totalCost,
        packageId: pkg.id,
        packageName: pkg.name,
        method: "reseller",
        status: "completed",
        resellerId: reseller.id,
      },
    });

    return NextResponse.json({
      vouchers: createdVouchers.map(mapVoucher),
      reseller: {
        walletBalanceKES: updatedReseller.walletBalanceKES,
        totalEarnedKES: updatedReseller.totalEarnedKES,
        totalSalesKES: updatedReseller.totalSalesKES,
      },
    });
  } catch (err) {
    console.error("POST /api/reseller/buy-vouchers error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
