import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { WifiVoucher } from "@/lib/types";

export const dynamic = "force-dynamic";

function mapVoucher(v: any): WifiVoucher {
  return {
    id: v.id,
    code: v.code,
    packageName: v.packageName,
    priceKES: v.priceKES,
    status: v.status,
    usedBy: v.usedBy,
    usedAt: v.usedAt,
    createdAt: v.createdAt,
  };
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");

    const where = status === "unused" || status === "used" ? { status } : undefined;
    const vouchers = await db.voucher.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ vouchers: vouchers.map(mapVoucher) });
  } catch (err) {
    console.error("GET /api/vouchers error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
