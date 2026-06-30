import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { ReferralEntry } from "@/lib/types";

export const dynamic = "force-dynamic";

interface ReferralWithReferrer extends ReferralEntry {
  referrerName: string | null;
  referrerPhone: string;
}

function mapReferral(r: any): ReferralWithReferrer {
  return {
    id: r.id,
    referredPhone: r.referredPhone,
    referredName: r.referred?.name ?? null,
    status: r.status,
    rewardPoints: r.rewardPoints,
    createdAt: r.createdAt,
    completedAt: r.completedAt ?? null,
    referrerName: r.referrer?.name ?? null,
    referrerPhone: r.referrer?.phone ?? "",
  };
}

export async function GET() {
  try {
    const referrals = await db.referral.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        referrer: { select: { name: true, phone: true } },
        referred: { select: { name: true } },
      },
    });

    const result: ReferralWithReferrer[] = referrals.map(mapReferral);
    return NextResponse.json({ referrals: result });
  } catch (err) {
    console.error("GET /api/referrals error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
