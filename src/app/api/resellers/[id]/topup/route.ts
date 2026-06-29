import { NextResponse } from "next/server";
import { db } from "@/lib/db";
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

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { amountKES } = body || {};

    if (amountKES == null) {
      return NextResponse.json(
        { error: "Missing amountKES" },
        { status: 400 }
      );
    }

    const amount = Number(amountKES);
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json(
        { error: "amountKES must be greater than 0" },
        { status: 400 }
      );
    }

    const amountInt = Math.floor(amount);

    const existing = await db.reseller.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Reseller not found" }, { status: 404 });
    }

    const reseller = await db.reseller.update({
      where: { id },
      data: { walletBalanceKES: existing.walletBalanceKES + amountInt },
    });

    return NextResponse.json({ reseller: mapReseller(reseller) });
  } catch (err) {
    console.error("POST /api/resellers/[id]/topup error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
