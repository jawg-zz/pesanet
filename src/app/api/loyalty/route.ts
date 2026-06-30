import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { pointsToNextTier } from "@/lib/wifi-utils";
import type { LoyaltySummary } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const limitParam = url.searchParams.get("limit") ?? "100";
    const limitNum = Math.max(1, Math.min(500, parseInt(limitParam, 10) || 100));

    const customers = await db.customer.findMany({
      orderBy: { lifetimePoints: "desc" },
      take: limitNum,
      select: {
        id: true,
        phone: true,
        name: true,
        pointsBalance: true,
        lifetimePoints: true,
        tier: true,
        referralCode: true,
      },
    });

    // Compute referralsCount + referralsCompleted per customer in parallel.
    const summaries = await Promise.all(
      customers.map(async (c) => {
        const [referralsCount, referralsCompleted] = await Promise.all([
          db.referral.count({ where: { referrerCustomerId: c.id } }),
          db.referral.count({
            where: { referrerCustomerId: c.id, status: "completed" },
          }),
        ]);
        const { nextTier, pointsToNextTier: remaining } = pointsToNextTier(
          c.lifetimePoints ?? 0
        );
        const summary: LoyaltySummary = {
          customerId: c.id,
          phone: c.phone,
          name: c.name,
          pointsBalance: c.pointsBalance ?? 0,
          lifetimePoints: c.lifetimePoints ?? 0,
          tier: c.tier ?? "bronze",
          referralCode: c.referralCode ?? null,
          referralsCount,
          referralsCompleted,
          nextTier,
          pointsToNextTier: remaining,
        };
        return summary;
      })
    );

    return NextResponse.json({ loyalty: summaries });
  } catch (err) {
    console.error("GET /api/loyalty error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
