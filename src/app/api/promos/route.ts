import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { PromoCode } from "@/lib/types";

export const dynamic = "force-dynamic";

function mapPromo(p: any): PromoCode {
  return {
    id: p.id,
    code: p.code,
    description: p.description,
    discountType: p.discountType,
    discountValue: p.discountValue,
    active: p.active,
    usesCount: p.usesCount,
    maxUses: p.maxUses,
    expiresAt: p.expiresAt ? p.expiresAt.toISOString() : null,
    createdAt: p.createdAt.toISOString(),
  };
}

export async function GET() {
  try {
    const promos = await db.promoCode.findMany({
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ promos: promos.map(mapPromo) });
  } catch (err) {
    console.error("GET /api/promos error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { code, description, discountType, discountValue, maxUses, expiresAt } =
      body || {};

    if (!code || !description || !discountType || discountValue == null) {
      return NextResponse.json(
        { error: "Missing required fields: code, description, discountType, discountValue" },
        { status: 400 }
      );
    }

    if (!["percent", "fixed"].includes(String(discountType))) {
      return NextResponse.json(
        { error: "discountType must be 'percent' or 'fixed'" },
        { status: 400 }
      );
    }

    const upperCode = String(code).toUpperCase().trim();

    const existing = await db.promoCode.findUnique({ where: { code: upperCode } });
    if (existing) {
      return NextResponse.json(
        { error: "Promo code already exists" },
        { status: 400 }
      );
    }

    const value = Number(discountValue);
    if (!Number.isFinite(value) || value < 0) {
      return NextResponse.json(
        { error: "discountValue must be a non-negative number" },
        { status: 400 }
      );
    }

    const maxUsesNum =
      maxUses == null ? 0 : Math.max(0, Math.floor(Number(maxUses) || 0));

    const expiresAtDate = expiresAt ? new Date(expiresAt) : null;
    if (expiresAt && (!expiresAtDate || isNaN(expiresAtDate.getTime()))) {
      return NextResponse.json(
        { error: "Invalid expiresAt date" },
        { status: 400 }
      );
    }

    const promo = await db.promoCode.create({
      data: {
        code: upperCode,
        description: String(description),
        discountType: String(discountType),
        discountValue: value,
        maxUses: maxUsesNum,
        expiresAt: expiresAtDate,
      },
    });

    return NextResponse.json({ promo: mapPromo(promo) });
  } catch (err) {
    console.error("POST /api/promos error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
