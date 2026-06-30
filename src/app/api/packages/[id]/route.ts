import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { WifiPackage } from "@/lib/types";

export const dynamic = "force-dynamic";

function mapPackage(p: any): WifiPackage {
  return {
    id: p.id,
    name: p.name,
    priceKES: p.priceKES,
    durationMinutes: p.durationMinutes,
    dataLimitMB: p.dataLimitMB,
    downloadSpeedMbps: p.downloadSpeedMbps,
    uploadSpeedMbps: p.uploadSpeedMbps,
    description: p.description,
    popular: p.popular,
    active: p.active,
    createdAt: p.createdAt,
  };
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();

    const existing = await db.package.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Package not found" }, { status: 404 });
    }

    const data: Record<string, unknown> = {};
    const allowed = [
      "name",
      "priceKES",
      "durationMinutes",
      "dataLimitMB",
      "downloadSpeedMbps",
      "uploadSpeedMbps",
      "description",
      "popular",
      "active",
    ];
    for (const key of allowed) {
      if (key in body) data[key] = body[key];
    }

    const updated = await db.package.update({ where: { id }, data });
    return NextResponse.json({ package: mapPackage(updated) });
  } catch (err) {
    console.error("PUT /api/packages/[id] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const existing = await db.package.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Package not found" }, { status: 404 });
    }

    await db.package.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/packages/[id] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
