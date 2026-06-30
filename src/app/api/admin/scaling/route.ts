import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCacheStats, cacheFlush } from "@/lib/cache"
import { getRateLimitStats } from "@/lib/rate-limit"

export const dynamic = "force-dynamic"

/**
 * Scaling & performance observability endpoint.
 * GET returns runtime stats; POST with { action: "flush" } clears the cache.
 */
export async function GET() {
  try {
    // DB table counts for capacity awareness.
    const [
      sessions,
      transactions,
      customers,
      vouchers,
      networkEvents,
      feedback,
    ] = await Promise.all([
      db.session.count(),
      db.transaction.count(),
      db.customer.count(),
      db.voucher.count(),
      db.networkEvent.count(),
      db.feedback.count(),
    ])

    const mem = process.memoryUsage()

    return NextResponse.json({
      process: {
        uptimeSeconds: Math.floor(process.uptime()),
        memoryMb: {
          rss: Math.round(mem.rss / 1024 / 1024),
          heapUsed: Math.round(mem.heapUsed / 1024 / 1024),
          heapTotal: Math.round(mem.heapTotal / 1024 / 1024),
        },
      },
      database: {
        provider: "sqlite",
        rows: {
          sessions,
          transactions,
          customers,
          vouchers,
          networkEvents,
          feedback,
        },
      },
      cache: getCacheStats(),
      rateLimit: getRateLimitStats(),
      indexes: [
        "Session: [status], [phone], [customerId], [siteId], [status,endTime], [startTime]",
        "Transaction: [status], [phone], [customerId], [createdAt], [status,createdAt]",
        "Voucher: [status], [resellerId], [createdAt]",
        "SupportTicket: [status], [phone], [createdAt]",
        "NetworkEvent: [createdAt], [siteId], [action]",
        "PointsTransaction: [customerId], [createdAt]",
        "Subscription: [status], [nextChargeAt], [phone]",
        "Announcement: [active]",
        "Feedback: [rating], [createdAt]",
        "Package: [active]",
      ],
    })
  } catch (err) {
    console.error("GET /api/admin/scaling error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    if (body?.action === "flush") {
      cacheFlush()
      return NextResponse.json({ success: true, message: "Cache flushed" })
    }
    return NextResponse.json({ error: "Unknown action" }, { status: 400 })
  } catch (err) {
    console.error("POST /api/admin/scaling error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
