import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { generateVoucherCode } from "@/lib/wifi-utils";
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

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { packageId, count: rawCount } = body || {};

    if (!packageId) {
      return NextResponse.json(
        { error: "Missing packageId" },
        { status: 400 }
      );
    }

    const pkg = await db.package.findUnique({ where: { id: String(packageId) } });
    if (!pkg) {
      return NextResponse.json(
        { error: "Package not found" },
        { status: 400 }
      );
    }

    let count = Number(rawCount);
    if (!Number.isFinite(count)) count = 5;
    count = Math.max(1, Math.min(100, Math.floor(count)));

    const batchId = `BATCH-${Date.now()}`;

    // Generate unique codes — retry on collision (very unlikely with cuid + random)
    const created: any[] = [];
    for (let i = 0; i < count; i++) {
      let code = generateVoucherCode();
      // Ensure uniqueness within DB (retry on collision)
      let exists = await db.voucher.findUnique({ where: { code } });
      while (exists) {
        code = generateVoucherCode();
        exists = await db.voucher.findUnique({ where: { code } });
      }
      const v = await db.voucher.create({
        data: {
          code,
          packageId: pkg.id,
          packageName: pkg.name,
          priceKES: pkg.priceKES,
          status: "unused",
          batchId,
        },
      });
      created.push(v);
    }

    return NextResponse.json({ vouchers: created.map(mapVoucher) });
  } catch (err) {
    console.error("POST /api/vouchers/generate error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
