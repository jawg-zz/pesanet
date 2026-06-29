import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { validateKePhone, normaliseKePhone } from "@/lib/wifi-utils";
import type { Reseller } from "@/lib/types";

export const dynamic = "force-dynamic";

function mapReseller(r: any): Reseller {
  return {
    id: r.id,
    phone: r.phone,
    name: r.name,
    businessName: r.businessName ?? null,
    location: r.location ?? null,
    commissionRate: r.commissionRate,
    walletBalanceKES: r.walletBalanceKES,
    totalEarnedKES: r.totalEarnedKES,
    totalSalesKES: r.totalSalesKES,
    status: r.status,
    createdAt: r.createdAt.toISOString(),
  };
}

export async function GET() {
  try {
    const resellers = await db.reseller.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { vouchers: true } },
      },
    });

    // For each reseller, compute sold/unsold counts
    const ids = resellers.map((r) => r.id);
    const [soldAgg, unsoldAgg] = await Promise.all([
      db.voucher.groupBy({
        by: ["resellerId"],
        where: { resellerId: { in: ids }, status: "used" },
        _count: { _all: true },
      }),
      db.voucher.groupBy({
        by: ["resellerId"],
        where: { resellerId: { in: ids }, status: "unused" },
        _count: { _all: true },
      }),
    ]);

    const soldMap = new Map<string, number>();
    for (const row of soldAgg) {
      if (row.resellerId) soldMap.set(row.resellerId, row._count._all);
    }
    const unsoldMap = new Map<string, number>();
    for (const row of unsoldAgg) {
      if (row.resellerId) unsoldMap.set(row.resellerId, row._count._all);
    }

    const result = resellers.map((r) => ({
      ...mapReseller(r),
      vouchersSold: soldMap.get(r.id) ?? 0,
      vouchersUnsold: unsoldMap.get(r.id) ?? 0,
    }));

    return NextResponse.json({ resellers: result });
  } catch (err) {
    console.error("GET /api/resellers error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { phone, name, businessName, location, commissionRate } = body || {};

    if (!phone || !name) {
      return NextResponse.json(
        { error: "Missing phone or name" },
        { status: 400 }
      );
    }

    if (!validateKePhone(String(phone))) {
      return NextResponse.json(
        { error: "Invalid Kenyan phone number" },
        { status: 400 }
      );
    }

    const normalisedPhone = normaliseKePhone(String(phone));

    const existing = await db.reseller.findUnique({
      where: { phone: normalisedPhone },
    });
    if (existing) {
      return NextResponse.json(
        { error: "A reseller with this phone already exists" },
        { status: 400 }
      );
    }

    const rate =
      commissionRate == null
        ? 10
        : Math.max(0, Math.min(100, Number(commissionRate) || 0));

    const reseller = await db.reseller.create({
      data: {
        phone: normalisedPhone,
        name: String(name),
        businessName: businessName ? String(businessName) : null,
        location: location ? String(location) : null,
        commissionRate: rate,
      },
    });

    return NextResponse.json({ reseller: mapReseller(reseller) });
  } catch (err) {
    console.error("POST /api/resellers error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
