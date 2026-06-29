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

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const activeOnly = searchParams.get("active");

    const where = activeOnly === "true" ? { active: true } : undefined;
    const packages = await db.package.findMany({
      where,
      orderBy: { priceKES: "asc" },
    });

    return NextResponse.json({ packages: packages.map(mapPackage) });
  } catch (err) {
    console.error("GET /api/packages error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      name,
      priceKES,
      durationMinutes,
      dataLimitMB,
      downloadSpeedMbps,
      uploadSpeedMbps,
      description,
      popular,
    } = body || {};

    if (
      !name ||
      typeof name !== "string" ||
      typeof priceKES !== "number" ||
      typeof durationMinutes !== "number" ||
      typeof dataLimitMB !== "number" ||
      typeof downloadSpeedMbps !== "number" ||
      typeof uploadSpeedMbps !== "number"
    ) {
      return NextResponse.json(
        { error: "Missing or invalid required fields" },
        { status: 400 }
      );
    }

    const pkg = await db.package.create({
      data: {
        name,
        priceKES,
        durationMinutes,
        dataLimitMB,
        downloadSpeedMbps,
        uploadSpeedMbps,
        description: description ?? "",
        popular: Boolean(popular),
      },
    });

    return NextResponse.json({ package: mapPackage(pkg) });
  } catch (err) {
    console.error("POST /api/packages error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
