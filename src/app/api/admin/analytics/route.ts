import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { AnalyticsData } from "@/lib/types";

export const dynamic = "force-dynamic";

/** Hour-of-day integer (0..23) in Africa/Nairobi for a given Date. */
function nairobiHour(date: Date): number {
  const fmt = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Nairobi",
    hour: "2-digit",
    hour12: false,
  });
  const hour = fmt.format(date);
  // Intl can return "24" at midnight in some environments — normalise to 0.
  const n = parseInt(hour, 10);
  return n === 24 ? 0 : n;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const daysParam = Number(searchParams.get("days") ?? 30);
    const days =
      Number.isFinite(daysParam) && daysParam > 0
        ? Math.min(90, Math.max(1, Math.floor(daysParam)))
        : 30;

    const now = new Date();
    const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    // Fetch all sessions started in the window (we need packageName, priceKES,
    // startTime, siteId for the various buckets).
    const [sessions, sites, feedbackRows] = await Promise.all([
      db.session.findMany({
        where: { startTime: { gte: cutoff } },
        select: {
          packageName: true,
          priceKES: true,
          startTime: true,
          siteId: true,
        },
      }),
      db.hotspotSite.findMany({ select: { id: true, name: true } }),
      db.feedback.findMany({ select: { rating: true } }),
    ]);

    // --- packagePopularity: count + revenue per packageName, sorted by count desc ---
    const pkgMap = new Map<string, { count: number; revenue: number }>();
    for (const s of sessions) {
      const key = s.packageName;
      const entry = pkgMap.get(key) ?? { count: 0, revenue: 0 };
      entry.count += 1;
      entry.revenue += s.priceKES || 0;
      pkgMap.set(key, entry);
    }
    const packagePopularity = Array.from(pkgMap.entries())
      .map(([packageName, v]) => ({
        packageName,
        count: v.count,
        revenue: v.revenue,
      }))
      .sort((a, b) => b.count - a.count);

    // --- peakHours: 24 buckets (00:00..23:00) of session start hour in Nairobi tz ---
    const hourBuckets = Array.from({ length: 24 }, (_, h) => ({
      hour: `${h.toString().padStart(2, "0")}:00`,
      sessions: 0,
    }));
    for (const s of sessions) {
      const h = nairobiHour(s.startTime);
      hourBuckets[h].sessions += 1;
    }
    const peakHours = hourBuckets;

    // --- siteBreakdown: sessions + revenue per site, sorted by sessions desc ---
    const siteMap = new Map<
      string,
      { siteName: string; sessions: number; revenue: number }
    >();
    for (const site of sites) {
      siteMap.set(site.id, {
        siteName: site.name,
        sessions: 0,
        revenue: 0,
      });
    }
    for (const s of sessions) {
      if (!s.siteId) continue;
      const entry = siteMap.get(s.siteId);
      if (!entry) continue;
      entry.sessions += 1;
      entry.revenue += s.priceKES || 0;
    }
    const siteBreakdown = Array.from(siteMap.values()).sort(
      (a, b) => b.sessions - a.sessions
    );

    // --- ratingDistribution: count per rating 1..5 (always include all 5) ---
    const ratingBuckets = [1, 2, 3, 4, 5].map((rating) => ({
      rating,
      count: 0,
    }));
    const ratingIndex: Record<number, number> = {
      1: 0,
      2: 1,
      3: 2,
      4: 3,
      5: 4,
    };
    for (const f of feedbackRows) {
      const idx = ratingIndex[f.rating];
      if (idx != null) ratingBuckets[idx].count += 1;
    }
    const ratingDistribution = ratingBuckets;

    const analytics: AnalyticsData = {
      packagePopularity,
      peakHours,
      siteBreakdown,
      ratingDistribution,
    };

    return NextResponse.json({ analytics });
  } catch (err) {
    console.error("GET /api/admin/analytics error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
