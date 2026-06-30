import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { SubscriptionEntry } from "@/lib/types";

export const dynamic = "force-dynamic";

function mapSubscription(s: any): SubscriptionEntry {
  return {
    id: s.id,
    phone: s.phone,
    packageName: s.packageName,
    priceKES: s.priceKES,
    status: s.status,
    nextChargeAt: s.nextChargeAt,
    lastChargedAt: s.lastChargedAt ?? null,
    customerName: s.customer?.name ?? null,
    createdAt: s.createdAt,
  };
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { action } = body || {};

    if (!action || !["pause", "resume", "cancel"].includes(String(action))) {
      return NextResponse.json(
        { error: "action must be one of: pause, resume, cancel" },
        { status: 400 }
      );
    }

    const sub = await db.subscription.findUnique({
      where: { id },
      include: { customer: { select: { name: true } } },
    });
    if (!sub) {
      return NextResponse.json(
        { error: "Subscription not found" },
        { status: 404 }
      );
    }

    const act = String(action);
    const now = new Date();

    if (act === "pause") {
      const updated = await db.subscription.update({
        where: { id },
        data: { status: "paused" },
        include: { customer: { select: { name: true } } },
      });
      return NextResponse.json({ subscription: mapSubscription(updated) });
    }

    if (act === "cancel") {
      const updated = await db.subscription.update({
        where: { id },
        data: { status: "cancelled" },
        include: { customer: { select: { name: true } } },
      });
      return NextResponse.json({ subscription: mapSubscription(updated) });
    }

    // resume → status active, recompute nextChargeAt from package duration.
    const pkg = await db.package.findUnique({
      where: { id: sub.packageId },
    });
    const minutes = pkg?.durationMinutes ?? 1440;
    const nextChargeAt = new Date(now.getTime() + minutes * 60 * 1000);
    const updated = await db.subscription.update({
      where: { id },
      data: {
        status: "active",
        nextChargeAt,
      },
      include: { customer: { select: { name: true } } },
    });
    return NextResponse.json({ subscription: mapSubscription(updated) });
  } catch (err) {
    console.error("PATCH /api/subscriptions/[id] error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
