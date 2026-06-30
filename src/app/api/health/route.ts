import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCacheStats } from "@/lib/cache"
import { getRateLimitStats } from "@/lib/rate-limit"

export const dynamic = "force-dynamic"

/**
 * Load-balancer / monitoring readiness endpoint.
 * Returns 200 if the app is healthy (DB reachable), 503 otherwise.
 */
export async function GET() {
  const start = Date.now()
  let dbOk = true
  let dbLatencyMs = 0

  try {
    const t0 = Date.now()
    await db.$queryRaw`SELECT 1`
    dbLatencyMs = Date.now() - t0
  } catch {
    dbOk = false
  }

  const uptimeSeconds = Math.floor(process.uptime())
  const mem = process.memoryUsage()

  const body = {
    status: dbOk ? "ok" : "degraded",
    timestamp: new Date().toISOString(),
    uptimeSeconds,
    db: { ok: dbOk, latencyMs: dbLatencyMs },
    memory: {
      rssMb: Math.round(mem.rss / 1024 / 1024),
      heapUsedMb: Math.round(mem.heapUsed / 1024 / 1024),
      heapTotalMb: Math.round(mem.heapTotal / 1024 / 1024),
    },
    cache: getCacheStats(),
    rateLimit: getRateLimitStats(),
    responseMs: Date.now() - start,
  }

  return NextResponse.json(body, { status: dbOk ? 200 : 503 })
}
