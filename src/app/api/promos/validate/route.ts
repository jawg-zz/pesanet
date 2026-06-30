import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { code, amountKES } = body || {};

    if (!code || amountKES == null) {
      return NextResponse.json(
        { error: "Missing code or amountKES" },
        { status: 400 }
      );
    }

    const amount = Number(amountKES);
    if (!Number.isFinite(amount) || amount < 0) {
      return NextResponse.json(
        { error: "amountKES must be a non-negative number" },
        { status: 400 }
      );
    }

    const upperCode = String(code).toUpperCase().trim();

    const promo = await db.promoCode.findUnique({ where: { code: upperCode } });

    if (!promo || !promo.active) {
      return NextResponse.json({
        valid: false,
        discountKES: 0,
        finalAmountKES: amount,
        message: "Invalid promo code",
      });
    }

    if (promo.expiresAt && promo.expiresAt.getTime() < Date.now()) {
      return NextResponse.json({
        valid: false,
        discountKES: 0,
        finalAmountKES: amount,
        message: "This promo code has expired",
      });
    }

    if (promo.maxUses > 0 && promo.usesCount >= promo.maxUses) {
      return NextResponse.json({
        valid: false,
        discountKES: 0,
        finalAmountKES: amount,
        message: "Promo code usage limit reached",
      });
    }

    let discountKES = 0;
    if (promo.discountType === "percent") {
      discountKES = Math.round((amount * promo.discountValue) / 100);
    } else if (promo.discountType === "fixed") {
      discountKES = Math.min(promo.discountValue, amount);
    }

    const finalAmountKES = Math.max(0, amount - discountKES);

    return NextResponse.json({
      valid: true,
      discountKES,
      finalAmountKES,
      message: `Promo applied: ${promo.description}`,
    });
  } catch (err) {
    console.error("POST /api/promos/validate error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
