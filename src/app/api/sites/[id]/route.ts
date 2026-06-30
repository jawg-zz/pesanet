import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { HotspotSite } from "@/lib/types";

export const dynamic = "force-dynamic";

function mapSite(
  s: any,
  activeSessions: number,
  totalSessions: number
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

async function loadSiteWithCounts(id: string) {
  const site = await db.hotspotSite.findUnique({ where: { id } });
  if (!site) return null;
  const [activeSessions, totalSessions] = await Promise.all([
    db.session.count({ where: { siteId: id, status: "active" } }),
    db.session.count({ where: { siteId: id } }),
  ]);
  return mapSite(site, activeSessions, totalSessions);
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const existing = await db.hotspotSite.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Site not found" }, { status: 404 });
    }

    const body = await req.json();
    const { name, location, routerIp, maxUsers, status } = body || {};

    const data: any = {};
    if (name != null && typeof name === "string" && name.trim()) {
      data.name = name.trim();
    }
    if (location != null && typeof location === "string" && location.trim()) {
      data.location = location.trim();
    }
    if (routerIp != null) {
      // Allow clearing the router IP by passing an empty string.
      data.routerIp = String(routerIp).trim() || null;
    }
    if (maxUsers != null) {
      const n = Number(maxUsers);
      if (Number.isFinite(n) && n >= 0) data.maxUsers = Math.floor(n);
    }
    if (status != null) {
      const validStatuses = ["active", "inactive", "maintenance"];
      if (validStatuses.includes(String(status))) {
        data.status = String(status);
      }
    }

    await db.hotspotSite.update({ where: { id }, data });

    const site = await loadSiteWithCounts(id);
    return NextResponse.json({ site });
  } catch (err) {
    console.error("PUT /api/sites/[id] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const existing = await db.hotspotSite.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Site not found" }, { status: 404 });
    }

    // Pre-check: refuse deletion if any sessions still reference this site.
    // (Prisma's default SetNull would otherwise silently orphan the sessions.)
    const sessionCount = await db.session.count({
      where: { siteId: id },
    });
    if (sessionCount > 0) {
      return NextResponse.json(
        {
          error:
            "Cannot delete a site with existing sessions. Set it to inactive instead.",
        },
        { status: 400 }
      );
    }

    try {
      await db.hotspotSite.delete({ where: { id } });
      return NextResponse.json({ success: true });
    } catch (delErr: any) {
      // Defensive: also catch any FK error code, just in case.
      if (delErr?.code === "P2003") {
        return NextResponse.json(
          {
            error:
              "Cannot delete a site with existing sessions. Set it to inactive instead.",
          },
          { status: 400 }
        );
      }
      throw delErr;
    }
  } catch (err) {
    console.error("DELETE /api/sites/[id] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
