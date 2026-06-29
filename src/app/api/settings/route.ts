import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { BusinessSettings } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const rows = await db.setting.findMany();
    const settings: BusinessSettings = {};
    for (const row of rows) {
      settings[row.key] = row.value;
    }
    return NextResponse.json({ settings });
  } catch (err) {
    console.error("GET /api/settings error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { settings: incoming } = body || {};

    if (!incoming || typeof incoming !== "object") {
      return NextResponse.json(
        { error: "Missing settings object" },
        { status: 400 }
      );
    }

    const entries = Object.entries(incoming) as [string, unknown][];

    // Upsert each key/value pair
    for (const [key, value] of entries) {
      if (!key) continue;
      const strValue = value == null ? "" : String(value);
      await db.setting.upsert({
        where: { key },
        update: { value: strValue },
        create: { key, value: strValue },
      });
    }

    // Return the full updated settings object
    const rows = await db.setting.findMany();
    const settings: BusinessSettings = {};
    for (const row of rows) {
      settings[row.key] = row.value;
    }

    return NextResponse.json({ settings });
  } catch (err) {
    console.error("PUT /api/settings error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
