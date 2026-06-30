import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { normaliseKePhone } from "@/lib/wifi-utils";
import type {
  ResellerStats,
  WifiTransaction,
  WifiVoucher,
} from "@/lib/types";

export const dynamic = "force-dynamic";

function mapTransaction(t: any): WifiTransaction {
  return {
    id: t.id,
    phone: t.phone,
    amountKES: t.amountKES,
    packageName: t.packageName ?? null,
    method: t.method,
    mpesaRef: t.mpesaRef ?? null,
    status: t.status,
    promoCode: t.promoCode ?? null,
    discountKES: t.discountKES ?? 0,
    resellerId: t.resellerId ?? null,
    createdAt: t.createdAt.toISOString(),
  };
}

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

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const phone = searchParams.get("phone");

    if (!phone) {
      return NextResponse.json(
        { error: "Missing phone query parameter" },
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

    const [vouchersSold, vouchersUnsold, recentSalesRaw, recentVouchersRaw] =
      await Promise.all([
        db.voucher.count({
          where: { resellerId: reseller.id, status: "used" },
        }),
        db.voucher.count({
          where: { resellerId: reseller.id, status: "unused" },
        }),
        db.transaction.findMany({
          where: { resellerId: reseller.id },
          orderBy: { createdAt: "desc" },
          take: 10,
        }),
        db.voucher.findMany({
          where: { resellerId: reseller.id },
          orderBy: { createdAt: "desc" },
          take: 10,
        }),
      ]);

    const stats: ResellerStats = {
      walletBalanceKES: reseller.walletBalanceKES,
      totalEarnedKES: reseller.totalEarnedKES,
      totalSalesKES: reseller.totalSalesKES,
      commissionRate: reseller.commissionRate,
      vouchersSold,
      vouchersUnsold,
      recentSales: recentSalesRaw.map(mapTransaction),
      recentVouchers: recentVouchersRaw.map(mapVoucher),
    };

    return NextResponse.json(stats);
  } catch (err) {
    console.error("GET /api/reseller/me error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
