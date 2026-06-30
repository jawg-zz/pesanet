import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { AdminStats } from "@/lib/types";
import { startOfDayNairobi } from "@/lib/wifi-utils";
import { cacheThrough } from "@/lib/cache";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Auto-expire stale active sessions (cheap updateMany; safe to run on each
    // stats fetch since the query is indexed on [status, endTime]).
    await db.session.updateMany({
      where: {
        status: "active",
        endTime: { lt: new Date() },
      },
      data: { status: "expired" },
    });

    // Cache the (expensive) aggregation for 15s — admin dashboards poll often
    // but the numbers don't need to be real-time to the second.
    const stats = await cacheThrough<AdminStats>(
      "admin:stats",
      async () => {
        // Start of "today" in Africa/Nairobi (UTC+3), as a proper UTC instant.
        const startOfTodayEAT = startOfDayNairobi();
        const now = new Date();

        const [
          activeSessionsAgg,
          todaySessionsRows,
          completedTxRows,
          totalCustomersAgg,
          todaySessionsAgg,
          vouchersUnusedAgg,
          packagesActiveAgg,
          openTicketsAgg,
          activeResellersAgg,
          activeAnnouncementsAgg,
          feedbackAgg,
          totalFeedbackAgg,
          activeSubscriptionsAgg,
          pointsAgg,
        ] = await Promise.all([
          db.session.count({ where: { status: "active" } }),
          db.session.findMany({
            where: { startTime: { gte: startOfTodayEAT } },
            select: { priceKES: true, status: true },
          }),
          db.transaction.findMany({
            where: { status: "completed" },
            select: { amountKES: true },
          }),
          db.customer.count(),
          db.session.count({ where: { startTime: { gte: startOfTodayEAT } } }),
          db.voucher.count({ where: { status: "unused" } }),
          db.package.count({ where: { active: true } }),
          db.supportTicket.count({
            where: { status: { in: ["open", "in_progress"] } },
          }),
          db.reseller.count({ where: { status: "active" } }),
          db.announcement.count({
            where: {
              active: true,
              OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
            },
          }),
          db.feedback.aggregate({ _avg: { rating: true } }),
          db.feedback.count(),
          db.subscription.count({ where: { status: "active" } }),
          db.customer.aggregate({ _sum: { pointsBalance: true } }),
        ]);

        const todayRevenue = todaySessionsRows
          .filter((s) =>
            ["active", "expired", "disconnected"].includes(s.status)
          )
          .reduce((sum, s) => sum + (s.priceKES || 0), 0);

        const totalRevenue = completedTxRows.reduce(
          (sum, t) => sum + (t.amountKES || 0),
          0
        );

        const avgRating =
          feedbackAgg._avg.rating != null
            ? Math.round(feedbackAgg._avg.rating * 10) / 10
            : 0;

        return {
          activeSessions: activeSessionsAgg,
          todayRevenue,
          totalRevenue,
          totalCustomers: totalCustomersAgg,
          todaySessions: todaySessionsAgg,
          vouchersUnused: vouchersUnusedAgg,
          packagesActive: packagesActiveAgg,
          openTickets: openTicketsAgg,
          activeResellers: activeResellersAgg,
          activeAnnouncements: activeAnnouncementsAgg,
          avgRating,
          totalFeedback: totalFeedbackAgg,
          activeSubscriptions: activeSubscriptionsAgg,
          pointsCirculation: pointsAgg._sum.pointsBalance ?? 0,
        } satisfies AdminStats;
      },
      15_000 // 15s TTL — admin dashboards poll frequently
    );

    return NextResponse.json(stats);
  } catch (err) {
    console.error("GET /api/admin/stats error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
