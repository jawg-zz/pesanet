import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  generateMpesaRef,
  generateFakeIP,
  generateFakeMAC,
} from "@/lib/wifi-utils";
import { awardPoints } from "@/lib/loyalty";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const now = new Date();

    // All active subscriptions whose nextChargeAt is due.
    const due = await db.subscription.findMany({
      where: {
        status: "active",
        nextChargeAt: { lte: now },
      },
      include: { customer: { select: { id: true, name: true } } },
    });

    if (due.length === 0) {
      return NextResponse.json({
        processed: 0,
        revenue: 0,
        message: "No subscriptions are due for renewal right now.",
      });
    }

    let totalRevenue = 0;

    // Pick a single active site to tag all auto-renew sessions to (fall back to
    // any site). Avoids N extra lookups.
    let fallbackSiteId: string | undefined;
    const activeSite = await db.hotspotSite.findFirst({
      where: { status: "active" },
      select: { id: true },
    });
    if (activeSite) {
      fallbackSiteId = activeSite.id;
    } else {
      const anySite = await db.hotspotSite.findFirst({ select: { id: true } });
      fallbackSiteId = anySite?.id;
    }

    for (const sub of due) {
      const mpesaRef = generateMpesaRef();

      // 1. Record the M-Pesa transaction as completed.
      const tx = await db.transaction.create({
        data: {
          customerId: sub.customerId,
          phone: sub.phone,
          amountKES: sub.priceKES,
          packageId: sub.packageId,
          packageName: sub.packageName,
          method: "mpesa",
          mpesaRef,
          status: "completed",
        },
      });

      // 2. Create an active WiFi session tagged to a site.
      const pkg = await db.package.findUnique({
        where: { id: sub.packageId },
      });
      const minutes = pkg?.durationMinutes ?? 60;
      const endTime = new Date(now.getTime() + minutes * 60 * 1000);

      await db.session.create({
        data: {
          customerId: sub.customerId,
          packageId: sub.packageId,
          phone: sub.phone,
          packageName: sub.packageName,
          priceKES: sub.priceKES,
          startTime: now,
          endTime,
          durationMinutes: minutes,
          status: "active",
          authMethod: "mpesa",
          mpesaRef,
          ipAddress: generateFakeIP(),
          macAddress: generateFakeMAC(),
          ...(fallbackSiteId ? { siteId: fallbackSiteId } : {}),
        },
      });

      // 3. Award loyalty points (1 pt / KES charged).
      try {
        const points = sub.priceKES;
        if (points > 0) {
          await awardPoints(
            sub.customerId,
            points,
            "earn_purchase",
            `Auto-renew: ${sub.packageName}`,
            tx.id
          );
        }
      } catch (e) {
        console.error("Failed to award auto-renew loyalty points:", e);
      }

      // 4. Tell the network backend to activate the hotspot user.
      try {
        const { getNetworkProvider } = await import("@/lib/network-provider")
        const provider = await getNetworkProvider(fallbackSiteId)
        void provider.activate({
          username: sub.phone,
          password: sub.phone,
          timeoutMinutes: minutes,
          downloadMbps: pkg?.downloadSpeedMbps ?? 0,
          uploadMbps: pkg?.uploadSpeedMbps ?? 0,
          sessionId: tx.id, // best-effort link
          phone: sub.phone,
        })
      } catch (e) {
        console.error("Network backend activate (auto-renew) failed:", e);
      }

      // 5. Advance the subscription schedule.
      const nextChargeAt = new Date(now.getTime() + minutes * 60 * 1000);
      await db.subscription.update({
        where: { id: sub.id },
        data: {
          lastChargedAt: now,
          nextChargeAt,
        },
      });

      totalRevenue += sub.priceKES;
    }

    return NextResponse.json({
      processed: due.length,
      revenue: totalRevenue,
      message: `Auto-renewed ${due.length} subscription${due.length === 1 ? "" : "s"} for KES ${totalRevenue.toLocaleString("en-KE")}.`,
    });
  } catch (err) {
    console.error("POST /api/subscriptions/process error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
