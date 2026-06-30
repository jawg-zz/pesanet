import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { pointsToNextTier, tierForPoints } from "@/lib/wifi-utils";
import { awardPoints } from "@/lib/loyalty";
import type {
  LoyaltySummary,
  PointsLedgerEntry,
  ReferralEntry,
} from "@/lib/types";

export const dynamic = "force-dynamic";

function buildSummary(
  c: any,
  referralsCount = 0,
  referralsCompleted = 0
): LoyaltySummary {
  const { nextTier, pointsToNextTier: remaining } = pointsToNextTier(
    c.lifetimePoints ?? 0
  );
  return {
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
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ customerId: string }> }
) {
  try {
    const { customerId } = await params;

    const customer = await db.customer.findUnique({
      where: { id: customerId },
      include: {
        pointsLedger: { orderBy: { createdAt: "desc" }, take: 100 },
        referralsMade: {
          orderBy: { createdAt: "desc" },
          include: {
            referred: { select: { name: true } },
          },
        },
      },
    });
    if (!customer) {
      return NextResponse.json(
        { error: "Customer not found" },
        { status: 404 }
      );
    }

    // referralsCompleted must be filtered by status="completed".
    const [referralsCount, referralsCompleted] = await Promise.all([
      db.referral.count({ where: { referrerCustomerId: customerId } }),
      db.referral.count({
        where: { referrerCustomerId: customerId, status: "completed" },
      }),
    ]);
    const summary: LoyaltySummary = buildSummary(customer, referralsCount, referralsCompleted);
    const ledger: PointsLedgerEntry[] = customer.pointsLedger.map((p) => ({
      id: p.id,
      points: p.points,
      type: p.type,
      reason: p.reason,
      createdAt: p.createdAt,
    }));
    const referrals: ReferralEntry[] = customer.referralsMade.map((r) => ({
      id: r.id,
      referredPhone: r.referredPhone,
      referredName: r.referred?.name ?? null,
      status: r.status,
      rewardPoints: r.rewardPoints,
      createdAt: r.createdAt,
      completedAt: r.completedAt,
    }));

    return NextResponse.json({ summary, ledger, referrals });
  } catch (err) {
    console.error("GET /api/loyalty/[customerId] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ customerId: string }> }
) {
  try {
    const { customerId } = await params;
    const body = await req.json();
    const { pointsAdjust, reason } = body || {};

    if (
      typeof pointsAdjust !== "number" ||
      !Number.isFinite(pointsAdjust) ||
      pointsAdjust === 0
    ) {
      return NextResponse.json(
        { error: "pointsAdjust must be a non-zero integer" },
        { status: 400 }
      );
    }
    if (!reason || typeof reason !== "string" || !reason.trim()) {
      return NextResponse.json(
        { error: "A reason is required" },
        { status: 400 }
      );
    }

    const customer = await db.customer.findUnique({
      where: { id: customerId },
    });
    if (!customer) {
      return NextResponse.json(
        { error: "Customer not found" },
        { status: 404 }
      );
    }

    // Apply the adjustment. awardPoints already:
    //  - increments pointsBalance by signed points
    //  - increments lifetimePoints only when points > 0
    //  - recomputes tier from the new lifetime total
    //  - creates a PointsTransaction ledger row
    const updated = await awardPoints(
      customerId,
      pointsAdjust,
      "admin_adjust",
      reason.trim(),
      undefined
    );
    if (!updated) {
      return NextResponse.json(
        { error: "Customer not found" },
        { status: 404 }
      );
    }

    // Recompute summary from the updated record (referralsCount stays the same).
    const { nextTier, pointsToNextTier: remaining } = pointsToNextTier(
      updated.lifetimePoints ?? 0
    );
    const referralsCount = await db.referral.count({
      where: { referrerCustomerId: customerId },
    });
    const referralsCompleted = await db.referral.count({
      where: { referrerCustomerId: customerId, status: "completed" },
    });
    const summary: LoyaltySummary = {
      customerId: updated.id,
      phone: updated.phone,
      name: updated.name,
      pointsBalance: updated.pointsBalance ?? 0,
      lifetimePoints: updated.lifetimePoints ?? 0,
      tier: tierForPoints(updated.lifetimePoints ?? 0),
      referralCode: updated.referralCode ?? null,
      referralsCount,
      referralsCompleted,
      nextTier,
      pointsToNextTier: remaining,
    };

    return NextResponse.json({ summary });
  } catch (err) {
    console.error("PATCH /api/loyalty/[customerId] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
