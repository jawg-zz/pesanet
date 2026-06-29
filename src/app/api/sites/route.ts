import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { HotspotSite } from "@/lib/types";

export const dynamic = "force-dynamic";

function mapSite(
  s: any,
  activeSessions = 0,
  totalSessions = 0
): HotspotSite {
  return {
    id: s.id,
    name: s.name,
    location: s.location,
    routerIp: s.routerIp ?? null,
    maxUsers: s.maxUsers,
    status: s.status,
    createdAt: s.createdAt,
    activeSessions,
    totalSessions,
  };
}

export async function GET() {
  try {
    const sites = await db.hotspotSite.findMany({
      orderBy: { createdAt: "desc" },
    });

    // Compute session counts per site in parallel.
    const sitesWithCounts = await Promise.all(
      sites.map(async (site) => {
        const [activeSessions, totalSessions] = await Promise.all([
          db.session.count({
            where: { siteId: site.id, status: "active" },
          }),
          db.session.count({ where: { siteId: site.id } }),
        ]);
        return mapSite(site, activeSessions, totalSessions);
      })
    );

    return NextResponse.json({ sites: sitesWithCounts });
  } catch (err) {
    console.error("GET /api/sites error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, location, routerIp, maxUsers, status } = body || {};

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json(
        { error: "Missing or invalid name" },
        { status: 400 }
      );
    }
    if (!location || typeof location !== "string" || !location.trim()) {
      return NextResponse.json(
        { error: "Missing or invalid location" },
        { status: 400 }
      );
    }

    const validStatuses = ["active", "inactive", "maintenance"];
    const finalStatus =
      status && validStatuses.includes(String(status))
        ? String(status)
        : "active";

    const data: any = {
      name: name.trim(),
      location: location.trim(),
      status: finalStatus,
    };
    if (routerIp != null && String(routerIp).trim().length > 0) {
      data.routerIp = String(routerIp).trim();
    }
    if (maxUsers != null) {
      const n = Number(maxUsers);
      if (Number.isFinite(n) && n > 0) data.maxUsers = Math.floor(n);
    }

    const site = await db.hotspotSite.create({ data });
    // New site — no sessions yet.
    return NextResponse.json({ site: mapSite(site, 0, 0) });
  } catch (err) {
    console.error("POST /api/sites error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
