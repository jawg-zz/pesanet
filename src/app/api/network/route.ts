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

export async function GET() {
  try {
    const sites = await db.hotspotSite.findMany({
      orderBy: { createdAt: "asc" },
    });

    // For every site, ensure a RouterStatus row exists. Create one with sane
    // "online" defaults if it's missing — this matches the contract.
    const routers: RouterHealth[] = [];
    for (const site of sites) {
      let rs = await db.routerStatus.findUnique({
        where: { siteId: site.id },
      });
      if (!rs) {
        rs = await db.routerStatus.create({
          data: {
            siteId: site.id,
            status: site.status === "maintenance" ? "offline" : "online",
            uptimeSeconds: Math.floor(Math.random() * 86400 * 3),
            connectedDevices: 0,
            bandwidthInMbps: 0,
            bandwidthOutMbps: 0,
            cpuUsage: 5,
            memoryUsage: 20,
          },
        });
      }
      routers.push(mapRouter(rs, site));
    }

    return NextResponse.json({ routers });
  } catch (err) {
    console.error("GET /api/network error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
