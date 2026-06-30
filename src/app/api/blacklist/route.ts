import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  validateKePhone,
  normaliseKePhone,
} from "@/lib/wifi-utils";
import type { BlacklistEntry } from "@/lib/types";

export const dynamic = "force-dynamic";

function mapEntry(b: any): BlacklistEntry {
  return {
    id: b.id,
    phone: b.phone,
    reason: b.reason,
    createdAt: b.createdAt,
  };
}

export async function GET() {
  try {
    const blacklist = await db.blacklist.findMany({
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({
      blacklist: blacklist.map(mapEntry),
    });
  } catch (err) {
    console.error("GET /api/blacklist error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { phone, reason } = body || {};

    if (!phone) {
      return NextResponse.json(
        { error: "Missing phone" },
        { status: 400 }
      );
    }
    if (!validateKePhone(String(phone))) {
      return NextResponse.json(
        { error: "Invalid phone number" },
        { status: 400 }
      );
    }
    const normalisedPhone = normaliseKePhone(String(phone));
    const finalReason =
      reason && typeof reason === "string" && reason.trim()
        ? reason.trim()
        : "Blocked by administrator";

    const entry = await db.blacklist.upsert({
      where: { phone: normalisedPhone },
      update: { reason: finalReason },
      create: { phone: normalisedPhone, reason: finalReason },
    });

    return NextResponse.json({ entry: mapEntry(entry) });
  } catch (err) {
    console.error("POST /api/blacklist error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
