/**
 * PesaNet background scheduler.
 *
 * Runs periodic jobs that would otherwise block request handlers:
 *   - Auto-expire stale active sessions (every 60s)
 *   - Process due auto-renew subscriptions (every 2 min)
 *   - Log a heartbeat to the console (every 30s)
 *
 * Exposes a tiny HTTP health endpoint on port 3004 so the gateway / load
 * balancer can verify the worker is alive.
 *
 * In a horizontally-scaled deployment you would run N of these behind a
 * leader-election lock (or use a dedicated queue worker like BullMQ) so the
 * jobs run exactly once. For a single-instance deployment this is sufficient.
 */

import { createServer } from "http"
import { PrismaClient } from "@prisma/client"

const PORT = 3004
const db = new PrismaClient()

// ---------------------------------------------------------------------------

let cycleCount = 0
let lastExpireRun = { at: 0, affected: 0 }
let lastSubsRun = { at: 0, processed: 0, revenue: 0 }
let startedAt = Date.now()

/** Auto-expire sessions whose endTime has passed. */
async function autoExpireSessions() {
  try {
    const result = await db.session.updateMany({
      where: { status: "active", endTime: { lt: new Date() } },
      data: { status: "expired" },
    })
    lastExpireRun = { at: Date.now(), affected: result.count }
    if (result.count > 0) {
      console.log(
        `[expire] Marked ${result.count} session(s) as expired`
      )
    }
  } catch (e) {
    console.error("[expire] Failed:", e)
  }
}

/** Process due auto-renew subscriptions. */
async function processDueSubscriptions() {
  try {
    const now = new Date()
    const due = await db.subscription.findMany({
      where: { status: "active", nextChargeAt: { lte: now } },
    })
    if (due.length === 0) {
      lastSubsRun = { at: Date.now(), processed: 0, revenue: 0 }
      return
    }

    let totalRevenue = 0
    const activeSite = await db.hotspotSite.findFirst({
      where: { status: "active" },
      select: { id: true },
    })

    for (const sub of due) {
      const pkg = await db.package.findUnique({ where: { id: sub.packageId } })
      const minutes = pkg?.durationMinutes ?? 60

      // Create transaction + session (mirrors the main app's provisioning).
      await db.transaction.create({
        data: {
          customerId: sub.customerId,
          phone: sub.phone,
          amountKES: sub.priceKES,
          packageId: sub.packageId,
          packageName: sub.packageName,
          method: "mpesa",
          status: "completed",
        },
      })
      await db.session.create({
        data: {
          customerId: sub.customerId,
          packageId: sub.packageId,
          phone: sub.phone,
          packageName: sub.packageName,
          priceKES: sub.priceKES,
          startTime: now,
          endTime: new Date(now.getTime() + minutes * 60000),
          durationMinutes: minutes,
          status: "active",
          authMethod: "mpesa",
          ...(activeSite ? { siteId: activeSite.id } : {}),
        },
      })
      await db.subscription.update({
        where: { id: sub.id },
        data: {
          lastChargedAt: now,
          nextChargeAt: new Date(now.getTime() + minutes * 60000),
        },
      })
      totalRevenue += sub.priceKES
    }

    lastSubsRun = { at: Date.now(), processed: due.length, revenue: totalRevenue }
    console.log(
      `[subs] Processed ${due.length} subscription(s), revenue KES ${totalRevenue}`
    )
  } catch (e) {
    console.error("[subs] Failed:", e)
  }
}

// ---------------------------------------------------------------------------

const httpServer = createServer((req, res) => {
  const url = req.url ?? ""
  if (url === "/health" || url === "/api/health") {
    res.writeHead(200, { "Content-Type": "application/json" })
    res.end(
      JSON.stringify({
        status: "ok",
        worker: "scheduler",
        uptimeSeconds: Math.floor((Date.now() - startedAt) / 1000),
        cycles: cycleCount,
        lastExpireRun,
        lastSubsRun,
      })
    )
    return
  }
  res.writeHead(404)
  res.end("Not found")
})

httpServer.listen(PORT, () => {
  console.log(`PesaNet scheduler listening on port ${PORT}`)
})

// Job schedule
const EXPIRE_INTERVAL = 60_000 // 1 min
const SUBS_INTERVAL = 120_000 // 2 min
const HEARTBEAT_INTERVAL = 30_000 // 30s

setInterval(() => {
  cycleCount++
  void autoExpireSessions()
}, EXPIRE_INTERVAL)

setInterval(() => {
  void processDueSubscriptions()
}, SUBS_INTERVAL)

setInterval(() => {
  console.log(
    `[heartbeat] uptime=${Math.floor((Date.now() - startedAt) / 1000)}s cycles=${cycleCount} ` +
      `expire.last=${lastExpireRun.affected} subs.last=${lastSubsRun.processed}`
  )
}, HEARTBEAT_INTERVAL)

// Run once immediately on startup so the first cycle isn't delayed.
void autoExpireSessions()
void processDueSubscriptions()

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("Scheduler shutting down...")
  httpServer.close()
  setTimeout(() => process.exit(0), 500)
})
