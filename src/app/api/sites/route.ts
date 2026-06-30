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
    networkBackend: s.networkBackend ?? "none",
    backendHost: s.backendHost ?? null,
    backendPort: s.backendPort ?? 8728,
    backendUser: s.backendUser ?? null,
    backendRadiusHost: s.backendRadiusHost ?? null,
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
    const {
      name,
      location,
      routerIp,
      maxUsers,
      status,
      networkBackend,
      backendHost,
      backendPort,
      backendUser,
      backendPass,
      backendRadiusHost,
      backendRadiusSecret,
    } = body || {};

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

    // Network backend configuration.
    const validBackends = ["none", "mikrotik", "radius"];
    data.networkBackend =
      networkBackend && validBackends.includes(String(networkBackend))
        ? String(networkBackend)
        : "none";
    if (backendHost != null && String(backendHost).trim())
      data.backendHost = String(backendHost).trim();
    if (backendPort != null) {
      const p = Number(backendPort);
      if (Number.isFinite(p) && p > 0 && p < 65536) data.backendPort = Math.floor(p);
    }
    if (backendUser != null && String(backendUser).trim())
      data.backendUser = String(backendUser).trim();
    if (backendPass != null && String(backendPass).length > 0)
      data.backendPass = String(backendPass);
    if (backendRadiusHost != null && String(backendRadiusHost).trim())
      data.backendRadiusHost = String(backendRadiusHost).trim();
    if (backendRadiusSecret != null && String(backendRadiusSecret).length > 0)
      data.backendRadiusSecret = String(backendRadiusSecret);

    const site = await db.hotspotSite.create({ data });
    // New site — no sessions yet.
    return NextResponse.json({ site: mapSite(site, 0, 0) });
  } catch (err) {
    console.error("POST /api/sites error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
