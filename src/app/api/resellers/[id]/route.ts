import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
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

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();

    const existing = await db.reseller.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Reseller not found" }, { status: 404 });
    }

    const data: Record<string, unknown> = {};
    if (body.name != null) data.name = String(body.name);
    if (body.businessName != null)
      data.businessName = body.businessName ? String(body.businessName) : null;
    if (body.location != null)
      data.location = body.location ? String(body.location) : null;
    if (body.commissionRate != null) {
      const rate = Number(body.commissionRate);
      if (!Number.isFinite(rate) || rate < 0 || rate > 100) {
        return NextResponse.json(
          { error: "commissionRate must be between 0 and 100" },
          { status: 400 }
        );
      }
      data.commissionRate = rate;
    }
    if (body.status != null) {
      if (!["active", "suspended"].includes(String(body.status))) {
        return NextResponse.json(
          { error: "status must be 'active' or 'suspended'" },
          { status: 400 }
        );
      }
      data.status = String(body.status);
    }

    const reseller = await db.reseller.update({ where: { id }, data });
    return NextResponse.json({ reseller: mapReseller(reseller) });
  } catch (err) {
    console.error("PUT /api/resellers/[id] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const existing = await db.reseller.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Reseller not found" }, { status: 404 });
    }

    await db.reseller.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      // P2003 = foreign-key constraint failure
      if (err.code === "P2003") {
        return NextResponse.json(
          {
            error:
              "Cannot delete reseller with existing vouchers/transactions. Suspend instead.",
          },
          { status: 400 }
        );
      }
    }
    console.error("DELETE /api/resellers/[id] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
