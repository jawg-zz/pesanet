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

/** Simulate fresh router metrics for a site. */
function simulateMetrics(existing: any, site: any, activeSessions: number) {
  // Maintenance sites read as offline / idle.
  if (site?.status === "maintenance") {
    return {
      status: "offline",
      uptimeSeconds: 0,
      connectedDevices: 0,
      bandwidthInMbps: 0,
      bandwidthOutMbps: 0,
      cpuUsage: 0,
      memoryUsage: 0,
    };
  }

  // Add 60..600 seconds to the existing uptime, or start fresh.
  const deltaSec = 60 + Math.floor(Math.random() * 541);
  const uptimeSeconds = (existing?.uptimeSeconds ?? 0) + deltaSec;

  // Connected devices ≈ active sessions + a few extra (phones/laptops).
  const connectedDevices = Math.max(0, activeSessions + Math.floor(Math.random() * 9));

  // Load factor relative to max users drives warning vs online.
  const maxUsers = site?.maxUsers ?? 50;
  const loadRatio = maxUsers > 0 ? connectedDevices / maxUsers : 0;
  const status = loadRatio >= 0.85 ? "warning" : "online";

  // Bandwidth scales with the number of connected devices.
  const bandwidthInMbps = Math.round(connectedDevices * (5 + Math.random() * 15) * 10) / 10;
  const bandwidthOutMbps = Math.round(connectedDevices * (2 + Math.random() * 8) * 10) / 10;

  // CPU/memory scale with load.
  const cpuUsage = Math.round(Math.min(95, 10 + loadRatio * 70 + Math.random() * 15) * 10) / 10;
  const memoryUsage = Math.round(Math.min(95, 25 + loadRatio * 50 + Math.random() * 15) * 10) / 10;

  return {
    status,
    uptimeSeconds,
    connectedDevices,
    bandwidthInMbps,
    bandwidthOutMbps,
    cpuUsage,
    memoryUsage,
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

    const existing = await db.routerStatus.findUnique({
      where: { siteId },
    });

    const activeSessions = await db.session.count({
      where: { siteId, status: "active" },
    });

    const metrics = simulateMetrics(existing, site, activeSessions);

    const rs = await db.routerStatus.upsert({
      where: { siteId },
      update: { ...metrics, updatedAt: new Date() },
      create: { siteId, ...metrics, updatedAt: new Date() },
    });

    return NextResponse.json({ router: mapRouter(rs, site) });
  } catch (err) {
    console.error("POST /api/network/[siteId] error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
