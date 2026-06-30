import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { RouterHealth } from "@/lib/types";

export const dynamic = "force-dynamic";

function mapRouter(rs: any, site: any): RouterHealth {
  return {
    id: rs.id,
    siteId: rs.siteId,
    siteName: site?.name ?? "",
    location: site?.location ?? "",
    status: rs.status,
    uptimeSeconds: rs.uptimeSeconds,
    connectedDevices: rs.connectedDevices,
    maxUsers: site?.maxUsers ?? 0,
    bandwidthInMbps: rs.bandwidthInMbps,
    bandwidthOutMbps: rs.bandwidthOutMbps,
    cpuUsage: rs.cpuUsage,
    memoryUsage: rs.memoryUsage,
    updatedAt: rs.updatedAt,
  };
}

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ siteId: string }> }
) {
  try {
    const { siteId } = await params;

    const site = await db.hotspotSite.findUnique({
      where: { id: siteId },
    });
    if (!site) {
      return NextResponse.json(
        { error: "Site not found" },
        { status: 404 }
      );
    }

    // Reboot: status online, fresh uptime, devices/bandwidth zero, low load.
    const rs = await db.routerStatus.upsert({
      where: { siteId },
      update: {
        status: "online",
        uptimeSeconds: 0,
        connectedDevices: 0,
        bandwidthInMbps: 0,
        bandwidthOutMbps: 0,
        cpuUsage: 5,
        memoryUsage: 20,
        updatedAt: new Date(),
      },
      create: {
        siteId,
        status: "online",
        uptimeSeconds: 0,
        connectedDevices: 0,
        bandwidthInMbps: 0,
        bandwidthOutMbps: 0,
        cpuUsage: 5,
        memoryUsage: 20,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({
      router: mapRouter(rs, site),
      message: `Router at ${site.name} rebooted. It will come back online shortly.`,
    });
  } catch (err) {
    console.error("POST /api/network/[siteId]/reboot error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
