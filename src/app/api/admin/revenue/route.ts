import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { RevenuePoint } from "@/lib/types";
import { startOfDayNairobi, formatNairobiDayLabel } from "@/lib/wifi-utils";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const daysParam = Number(searchParams.get("days")) || 7;
    const days = Math.max(1, Math.min(30, daysParam));

    // Build day buckets aligned to Nairobi (UTC+3) calendar days, oldest first.
    const todayStart = startOfDayNairobi();
    const buckets: { start: Date; end: Date; label: string }[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const start = new Date(todayStart.getTime() - i * 86400000);
      const end = new Date(start.getTime() + 86400000);
      buckets.push({ start, end, label: formatNairobiDayLabel(start) });
    }

    const earliest = buckets[0].start;
    const latest = buckets[buckets.length - 1].end;

    const sessions = await db.session.findMany({
      where: {
        startTime: { gte: earliest, lt: latest },
      },
      select: { startTime: true, priceKES: true },
    });

    const data: RevenuePoint[] = buckets.map((b) => {
      let revenue = 0;
      let count = 0;
      for (const s of sessions) {
        const t = s.startTime.getTime();
        if (t >= b.start.getTime() && t < b.end.getTime()) {
          revenue += s.priceKES || 0;
          count++;
        }
      }
      return { date: b.label, revenue, sessions: count };
    });

    return NextResponse.json({ data });
  } catch (err) {
    console.error("GET /api/admin/revenue error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
