import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { WifiTransaction } from "@/lib/types";

export const dynamic = "force-dynamic";

function mapTransaction(t: any): WifiTransaction {
  return {
    id: t.id,
    phone: t.phone,
    amountKES: t.amountKES,
    packageName: t.packageName,
    method: t.method,
    mpesaRef: t.mpesaRef,
    status: t.status,
    createdAt: t.createdAt,
  };
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const limitParam = Number(searchParams.get("limit"));
    const limit =
      Number.isFinite(limitParam) && limitParam > 0
        ? Math.min(500, Math.floor(limitParam))
        : 100;

    const transactions = await db.transaction.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return NextResponse.json({
      transactions: transactions.map(mapTransaction),
    });
  } catch (err) {
    console.error("GET /api/transactions error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
