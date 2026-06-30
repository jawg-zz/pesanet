import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import type { NetworkEventEntry } from "@/lib/types"
import { timeAgo } from "@/lib/wifi-utils"

export const dynamic = "force-dynamic"

/** Get the network-backend event log (audit trail). */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const limit = Math.min(100, Number(searchParams.get("limit")) || 50)
    const siteId = searchParams.get("siteId")

    const where = siteId ? { siteId } : undefined
    const events = await db.networkEvent.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      include: { site: { select: { name: true } } },
    })

    const mapped: NetworkEventEntry[] = events.map((e) => ({
      id: e.id,
      siteId: e.siteId,
      siteName: e.site?.name ?? null,
      sessionId: e.sessionId,
      phone: e.phone,
      action: e.action,
      backend: e.backend,
      status: e.status,
      message: e.message,
      durationMs: e.durationMs,
      createdAt: e.createdAt.toISOString(),
    }))

    return NextResponse.json({
      events: mapped.map((e) => ({ ...e, _ago: timeAgo(e.createdAt) })),
    })
  } catch (err) {
    console.error("GET /api/network/events error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
