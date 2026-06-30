import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { SubscriptionEntry } from "@/lib/types";

export const dynamic = "force-dynamic";

function mapSubscription(s: any): SubscriptionEntry {
  return {
    id: s.id,
    phone: s.phone,
    packageName: s.packageName,
    priceKES: s.priceKES,
    status: s.status,
    nextChargeAt: s.nextChargeAt,
    lastChargedAt: s.lastChargedAt ?? null,
    customerName: s.customer?.name ?? null,
    createdAt: s.createdAt,
  };
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const statusParam = searchParams.get("status");

    const where: any = {};
    if (
      statusParam &&
      ["active", "paused", "cancelled"].includes(String(statusParam))
    ) {
      where.status = String(statusParam);
    }

    const subscriptions = await db.subscription.findMany({
      where,
      orderBy: { nextChargeAt: "asc" },
      include: {
        customer: { select: { name: true } },
      },
    });

    return NextResponse.json({
      subscriptions: subscriptions.map(mapSubscription),
    });
  } catch (err) {
    console.error("GET /api/subscriptions error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
