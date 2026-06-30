import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { SmsBroadcast } from "@/lib/types";

export const dynamic = "force-dynamic";

const VALID_AUDIENCES = new Set(["all", "active", "by_site", "by_package"]);

function mapBroadcast(b: any): SmsBroadcast {
  return {
    id: b.id,
    message: b.message,
    audience: b.audience,
    audienceFilter: b.audienceFilter ?? "",
    recipientCount: b.recipientCount ?? 0,
    status: b.status,
    createdAt: b.createdAt,
  };
}

/**
 * Compute the recipient count + a small sample of distinct customer phones
 * matching the given audience + filter.
 *
 *  - "all"        : every distinct phone in Customer
 *  - "active"     : every distinct phone with at least one active Session
 *  - "by_site"    : every distinct phone from Session where siteId = filter
 *  - "by_package" : every distinct phone from Session where packageName = filter
 */
export async function computeAudience(
  audience: string,
  audienceFilter?: string
): Promise<{ recipientCount: number; sample: string[] }> {
  let phones: string[] = [];

  if (audience === "all") {
    const rows = await db.customer.findMany({
      where: {},
      select: { phone: true },
    });
    phones = Array.from(new Set(rows.map((r) => r.phone)));
  } else if (audience === "active") {
    const rows = await db.session.findMany({
      where: { status: "active" },
      select: { phone: true },
    });
    phones = Array.from(new Set(rows.map((r) => r.phone)));
  } else if (audience === "by_site") {
    if (!audienceFilter) {
      return { recipientCount: 0, sample: [] };
    }
    const rows = await db.session.findMany({
      where: { siteId: String(audienceFilter) },
      select: { phone: true },
    });
    phones = Array.from(new Set(rows.map((r) => r.phone)));
  } else if (audience === "by_package") {
    if (!audienceFilter) {
      return { recipientCount: 0, sample: [] };
    }
    const rows = await db.session.findMany({
      where: { packageName: String(audienceFilter) },
      select: { phone: true },
    });
    phones = Array.from(new Set(rows.map((r) => r.phone)));
  }

  return {
    recipientCount: phones.length,
    sample: phones.slice(0, 5),
  };
}

export async function GET() {
  try {
    const broadcasts = await db.smsBroadcast.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return NextResponse.json({
      broadcasts: broadcasts.map(mapBroadcast),
    });
  } catch (err) {
    console.error("GET /api/sms error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { message, audience, audienceFilter } = body || {};

    if (!message || typeof message !== "string" || !message.trim()) {
      return NextResponse.json(
        { error: "Missing or invalid message" },
        { status: 400 }
      );
    }
    if (!audience || !VALID_AUDIENCES.has(String(audience))) {
      return NextResponse.json(
        {
          error:
            "Invalid audience. Must be one of: all, active, by_site, by_package",
        },
        { status: 400 }
      );
    }

    const aud = String(audience);
    const filter =
      audienceFilter != null && String(audienceFilter).trim().length > 0
        ? String(audienceFilter).trim()
        : "";

    // by_site / by_package require a filter value.
    if ((aud === "by_site" || aud === "by_package") && !filter) {
      return NextResponse.json(
        { error: `audienceFilter is required for audience="${aud}"` },
        { status: 400 }
      );
    }

    const { recipientCount } = await computeAudience(aud, filter);

    const broadcast = await db.smsBroadcast.create({
      data: {
        message: message.trim(),
        audience: aud,
        audienceFilter: filter,
        recipientCount,
        status: "sent",
      },
    });

    return NextResponse.json({
      broadcast: mapBroadcast(broadcast),
      recipientCount,
      message: `SMS broadcast sent to ${recipientCount} recipient${recipientCount === 1 ? "" : "s"}.`,
    });
  } catch (err) {
    console.error("POST /api/sms error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
