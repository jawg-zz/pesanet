import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { AdminStats } from "@/lib/types";
import { startOfDayNairobi } from "@/lib/wifi-utils";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Auto-expire stale active sessions
    await db.session.updateMany({
      where: {
        status: "active",
        endTime: { lt: new Date() },
      },
      data: { status: "expired" },
    });

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
      // Active announcements: active=true AND (expiresAt is null OR expiresAt > now)
      db.announcement.count({
        where: {
          active: true,
          OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
        },
      }),
      // Average rating across all feedback (1..5)
      db.feedback.aggregate({ _avg: { rating: true } }),
      db.feedback.count(),
      // Active auto-renew subscriptions
      db.subscription.count({ where: { status: "active" } }),
      // Total loyalty points in circulation (sum of all customers' pointsBalance)
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

    const stats: AdminStats = {
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
    };

    return NextResponse.json(stats);
  } catch (err) {
    console.error("GET /api/admin/stats error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
