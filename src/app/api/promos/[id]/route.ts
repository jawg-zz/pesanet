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

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();

    const existing = await db.promoCode.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Promo code not found" }, { status: 404 });
    }

    const data: Record<string, unknown> = {};
    if (body.code != null) data.code = String(body.code).toUpperCase().trim();
    if (body.description != null) data.description = String(body.description);
    if (body.discountType != null) {
      if (!["percent", "fixed"].includes(String(body.discountType))) {
        return NextResponse.json(
          { error: "discountType must be 'percent' or 'fixed'" },
          { status: 400 }
        );
      }
      data.discountType = String(body.discountType);
    }
    if (body.discountValue != null) {
      const v = Number(body.discountValue);
      if (!Number.isFinite(v) || v < 0) {
        return NextResponse.json(
          { error: "discountValue must be a non-negative number" },
          { status: 400 }
        );
      }
      data.discountValue = v;
    }
    if (body.active != null) data.active = Boolean(body.active);
    if (body.maxUses != null) {
      data.maxUses = Math.max(0, Math.floor(Number(body.maxUses) || 0));
    }
    if (body.expiresAt != null) {
      data.expiresAt = body.expiresAt ? new Date(body.expiresAt) : null;
    }

    const promo = await db.promoCode.update({ where: { id }, data });
    return NextResponse.json({ promo: mapPromo(promo) });
  } catch (err) {
    console.error("PUT /api/promos/[id] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const existing = await db.promoCode.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Promo code not found" }, { status: 404 });
    }

    await db.promoCode.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/promos/[id] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
