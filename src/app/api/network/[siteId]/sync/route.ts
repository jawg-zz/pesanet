import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getNetworkProvider } from "@/lib/network-provider"

export const dynamic = "force-dynamic"

/** Sync live active sessions from the router/NAS into PesaNet's view. */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ siteId: string }> }
) {
  try {
    const { siteId } = await params
    const site = await db.hotspotSite.findUnique({ where: { id: siteId } })
    if (!site) {
      return NextResponse.json({ error: "Site not found" }, { status: 404 })
    }
    const provider = await getNetworkProvider(siteId)
    const { sessions, result } = await provider.syncActive()
    return NextResponse.json({ sessions, result })
  } catch (err) {
    console.error("POST /api/network/[siteId]/sync error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
