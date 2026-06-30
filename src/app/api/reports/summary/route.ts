import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { RevenuePoint } from "@/lib/types";
import { startOfDayNairobi, formatNairobiDayLabel } from "@/lib/wifi-utils";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const daysParam = Number(searchParams.get("days")) || 30;
    const days = Math.max(1, Math.min(365, daysParam));

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

    const [sessions, transactions, customersAgg, vouchersUsedAgg] =
      await Promise.all([
        db.session.findMany({
          where: { startTime: { gte: earliest, lt: latest } },
          select: {
            startTime: true,
            priceKES: true,
            packageName: true,
            discountKES: true,
          },
        }),
        db.transaction.findMany({
          where: {
            status: "completed",
            createdAt: { gte: earliest, lt: latest },
          },
          select: { amountKES: true, discountKES: true },
        }),
        db.customer.count({
          where: { createdAt: { gte: earliest, lt: latest } },
        }),
        db.voucher.count({
          where: {
            status: "used",
            usedAt: { gte: earliest, lt: latest },
          },
        }),
      ]);

    const totalRevenue = transactions.reduce(
      (sum, t) => sum + (t.amountKES || 0),
      0
    );
    const totalSessions = sessions.length;
    const totalDiscountGiven = transactions.reduce(
      (sum, t) => sum + (t.discountKES || 0),
      0
    );
    const avgRevenuePerSession =
      totalSessions > 0 ? Math.round(totalRevenue / totalSessions) : 0;

    // byPackage — aggregate session count and revenue per package name.
    const packageMap = new Map<
      string,
      { packageName: string; count: number; revenue: number }
    >();
    for (const s of sessions) {
      const name = s.packageName;
      const existing = packageMap.get(name) ?? {
        packageName: name,
        count: 0,
        revenue: 0,
      };
      existing.count += 1;
      existing.revenue += s.priceKES || 0;
      packageMap.set(name, existing);
    }
    const byPackage = Array.from(packageMap.values()).sort(
      (a, b) => b.revenue - a.revenue
    );

    // byDay — bucket sessions by Nairobi day.
    const byDay: RevenuePoint[] = buckets.map((b) => {
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

    return NextResponse.json({
      summary: {
        totalRevenue,
        totalSessions,
        totalCustomers: customersAgg,
        avgRevenuePerSession,
        totalVouchersSold: vouchersUsedAgg,
        totalDiscountGiven,
        byPackage,
        byDay,
      },
    });
  } catch (err) {
    console.error("GET /api/reports/summary error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
