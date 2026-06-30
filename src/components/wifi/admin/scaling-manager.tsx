"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import {
  Activity,
  Database,
  Gauge,
  HardDrive,
  Loader2,
  RefreshCw,
  Server,
  Trash2,
  Zap,
} from "lucide-react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"
import { Progress } from "@/components/ui/progress"
import { useToast } from "@/hooks/use-toast"

interface ScalingData {
  process: {
    uptimeSeconds: number
    memoryMb: { rss: number; heapUsed: number; heapTotal: number }
  }
  database: {
    provider: string
    rows: {
      sessions: number
      transactions: number
      customers: number
      vouchers: number
      networkEvents: number
      feedback: number
    }
  }
  cache: {
    size: number
    hits: number
    misses: number
    sets: number
    evictions: number
    sweeps: number
    hitRate: number
    maxEntries: number
  }
  rateLimit: {
    totalRequests: number
    totalLimited: number
    trackedKeys: number
  }
  indexes: string[]
}

interface SchedulerHealth {
  status: string
  worker: string
  uptimeSeconds: number
  cycles: number
  lastExpireRun: { at: number; affected: number }
  lastSubsRun: { at: number; processed: number; revenue: number }
}

function fmtUptime(s: number) {
  if (s < 60) return `${s}s`
  if (s < 3600) return `${Math.floor(s / 60)}m ${s % 60}s`
  return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`
}

export function ScalingManager() {
  const { toast } = useToast()
  const [data, setData] = useState<ScalingData | null>(null)
  const [scheduler, setScheduler] = useState<SchedulerHealth | null>(null)
  const [loading, setLoading] = useState(true)
  const [flushing, setFlushing] = useState(false)

  async function load() {
    try {
      const [scalingRes, schedRes] = await Promise.all([
        fetch("/api/admin/scaling").then((r) => r.json() as Promise<ScalingData>),
        fetch("/api/health?XTransformPort=3004")
          .then((r) => r.json())
          .then((d): SchedulerHealth | null => {
            // Only treat it as the scheduler if it has the worker field.
            // (The gateway may route /api/health to the main app instead.)
            if (d && d.worker === "scheduler") return d as SchedulerHealth
            return null
          })
          .catch(() => null),
      ])
      setData(scalingRes)
      setScheduler(schedRes)
    } catch {
      /* ignore */
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    const id = setInterval(load, 10000)
    return () => clearInterval(id)
  }, [])

  async function flushCache() {
    setFlushing(true)
    try {
      await fetch("/api/admin/scaling", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "flush" }),
      })
      toast({ title: "Cache flushed", description: "All cached entries cleared." })
      load()
    } catch {
      toast({ title: "Flush failed", variant: "destructive" })
    } finally {
      setFlushing(false)
    }
  }

  if (loading || !data) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-8 w-48 rounded-lg" />
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-64 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      </div>
    )
  }

  const heapPct = data.process.memoryMb.heapTotal
    ? (data.process.memoryMb.heapUsed / data.process.memoryMb.heapTotal) * 100
    : 0
  const cachePct = data.cache.maxEntries
    ? (data.cache.size / data.cache.maxEntries) * 100
    : 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="flex flex-col gap-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Scaling &amp; Performance</h2>
          <p className="text-sm text-muted-foreground">
            Runtime stats, cache hit rates, rate-limit counters and background
            worker health.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load}>
            <RefreshCw className="size-4" />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={flushCache}
            disabled={flushing}
          >
            {flushing ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Trash2 className="size-4" />
            )}
            Flush cache
          </Button>
        </div>
      </div>

      {/* Top stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={<Activity className="size-5" />}
          label="Cache hit rate"
          value={`${data.cache.hitRate}%`}
          sub={`${data.cache.hits} hits / ${data.cache.misses} misses`}
          tone="emerald"
        />
        <StatCard
          icon={<Zap className="size-5" />}
          label="Rate-limited"
          value={data.rateLimit.totalLimited.toLocaleString()}
          sub={`of ${data.rateLimit.totalRequests.toLocaleString()} requests`}
          tone="amber"
        />
        <StatCard
          icon={<Database className="size-5" />}
          label="DB rows"
          value={(
            data.database.rows.sessions +
            data.database.rows.transactions +
            data.database.rows.customers
          ).toLocaleString()}
          sub={`${data.database.provider} · indexed`}
          tone="primary"
        />
        <StatCard
          icon={<HardDrive className="size-5" />}
          label="Heap used"
          value={`${data.process.memoryMb.heapUsed} MB`}
          sub={`/ ${data.process.memoryMb.heapTotal} MB`}
          tone="emerald"
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Cache panel */}
        <Card className="py-0">
          <CardHeader className="px-5 pt-5">
            <CardTitle className="flex items-center gap-2 text-base">
              <Gauge className="size-4 text-primary" />
              In-memory cache
            </CardTitle>
            <CardDescription>
              TTL cache with LRU eviction. Hot reads bypass the database.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 px-5 pb-5">
            <Row label="Entries" value={`${data.cache.size} / ${data.cache.maxEntries}`} />
            <Progress value={cachePct} className="h-2" />
            <Row label="Hits" value={data.cache.hits.toLocaleString()} />
            <Row label="Misses" value={data.cache.misses.toLocaleString()} />
            <Row label="Sets" value={data.cache.sets.toLocaleString()} />
            <Row label="Evictions" value={data.cache.evictions.toLocaleString()} />
            <Row label="Sweeps" value={data.cache.sweeps.toLocaleString()} />
            <Separator />
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Hit rate</span>
              <Badge className="border-transparent bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
                {data.cache.hitRate}%
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Rate limiter panel */}
        <Card className="py-0">
          <CardHeader className="px-5 pt-5">
            <CardTitle className="flex items-center gap-2 text-base">
              <Zap className="size-4 text-primary" />
              Rate limiter
            </CardTitle>
            <CardDescription>
              Sliding-window protection on purchase, voucher &amp; OTP endpoints.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 px-5 pb-5">
            <Row label="Total requests" value={data.rateLimit.totalRequests.toLocaleString()} />
            <Row label="Limited (429)" value={data.rateLimit.totalLimited.toLocaleString()} />
            <Row label="Tracked keys" value={data.rateLimit.trackedKeys.toLocaleString()} />
            <Separator />
            <div className="rounded-lg border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
              <p className="font-medium text-foreground">Limits</p>
              <ul className="mt-1 space-y-0.5">
                <li>• Purchases: 10 / min per phone</li>
                <li>• OTP requests: 3 / 5 min per phone</li>
                <li>• General API: 60 / min per IP</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Database panel */}
      <Card className="py-0">
        <CardHeader className="px-5 pt-5">
          <CardTitle className="flex items-center gap-2 text-base">
            <Database className="size-4 text-primary" />
            Database
          </CardTitle>
          <CardDescription>
            Row counts and the indexes powering hot queries.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 px-5 pb-5">
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <CountTile label="Sessions" value={data.database.rows.sessions} />
            <CountTile label="Transactions" value={data.database.rows.transactions} />
            <CountTile label="Customers" value={data.database.rows.customers} />
            <CountTile label="Vouchers" value={data.database.rows.vouchers} />
            <CountTile label="Net events" value={data.database.rows.networkEvents} />
            <CountTile label="Feedback" value={data.database.rows.feedback} />
          </div>
          <Separator />
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Indexed columns ({data.indexes.length})
            </p>
            <div className="flex flex-wrap gap-1.5">
              {data.indexes.map((idx, i) => (
                <Badge key={i} variant="outline" className="font-mono text-[10px]">
                  {idx}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Scheduler panel */}
      <Card className="py-0">
        <CardHeader className="px-5 pt-5">
          <CardTitle className="flex items-center gap-2 text-base">
            <Server className="size-4 text-primary" />
            Background scheduler
          </CardTitle>
          <CardDescription>
            Offloads auto-expiry and subscription processing from request handlers.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 px-5 pb-5">
          {scheduler ? (
            <>
              <div className="flex flex-wrap items-center gap-3">
                <Badge
                  className={
                    scheduler.status === "ok"
                      ? "border-transparent bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                      : "border-transparent bg-red-500/15 text-red-700"
                  }
                >
                  {scheduler.status === "ok" ? "Running" : "Down"}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  Uptime {fmtUptime(scheduler.uptimeSeconds)} · {scheduler.cycles} cycles
                </span>
              </div>
              <Separator />
              <Row label="Last expiry sweep" value={`${scheduler.lastExpireRun.affected} session(s) expired`} />
              <Row
                label="Last subscription run"
                value={
                  scheduler.lastSubsRun.processed > 0
                    ? `${scheduler.lastSubsRun.processed} processed · KES ${scheduler.lastSubsRun.revenue}`
                    : "None due"
                }
              />
              <div className="rounded-lg border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                <p className="font-medium text-foreground">Schedule</p>
                <ul className="mt-1 space-y-0.5">
                  <li>• Auto-expire stale sessions: every 60s</li>
                  <li>• Process due subscriptions: every 2 min</li>
                  <li>• Heartbeat: every 30s</li>
                </ul>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-300">
              <Activity className="size-4" />
              Scheduler not reachable (port 3004). Run it with{" "}
              <code className="font-mono">bun run dev</code> in{" "}
              <code className="font-mono">mini-services/scheduler</code>.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Production scaling notes */}
      <Card className="bg-muted/30 py-0">
        <CardHeader className="px-5 pt-5">
          <CardTitle className="flex items-center gap-2 text-base">
            <Server className="size-4 text-primary" />
            Production scaling path
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 px-5 pb-5 text-sm text-muted-foreground">
          <p>
            <span className="font-medium text-foreground">Database:</span> migrate
            SQLite → PostgreSQL (managed — RDS/Neon/Supabase) for multi-writer
            horizontal scaling. The Prisma schema is portable as-is.
          </p>
          <p>
            <span className="font-medium text-foreground">Cache:</span> swap the
            in-memory cache for Redis (same <code className="font-mono">cacheGet/Set</code>{" "}
            interface) to share cache across N app replicas.
          </p>
          <p>
            <span className="font-medium text-foreground">Rate limiter:</span> move
            to Redis-backed sliding window for cluster-wide limits.
          </p>
          <p>
            <span className="font-medium text-foreground">Scheduler:</span> run
            behind a leader-election lock (or BullMQ) so jobs fire exactly once
            across replicas.
          </p>
          <p>
            <span className="font-medium text-foreground">App servers:</span> run
            behind a load balancer (the <code className="font-mono">/api/health</code>{" "}
            endpoint drives readiness checks). Stateless — scale horizontally
            with demand.
          </p>
        </CardContent>
      </Card>
    </motion.div>
  )
}

function StatCard({
  icon,
  label,
  value,
  sub,
  tone,
}: {
  icon: React.ReactNode
  label: string
  value: string
  sub: string
  tone: "primary" | "emerald" | "amber"
}) {
  const toneClass =
    tone === "primary"
      ? "bg-primary/10 text-primary"
      : tone === "emerald"
      ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300"
      : "bg-amber-500/15 text-amber-600 dark:text-amber-300"
  return (
    <Card className="py-0">
      <CardContent className="flex items-center gap-4 p-5">
        <div className={`grid size-12 place-items-center rounded-xl ${toneClass}`}>
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="truncate text-xl font-bold tracking-tight">{value}</p>
          <p className="truncate text-xs text-muted-foreground">{sub}</p>
        </div>
      </CardContent>
    </Card>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium tabular-nums">{value}</span>
    </div>
  )
}

function CountTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border bg-muted/30 px-3 py-2 text-center">
      <p className="text-lg font-bold tabular-nums">{value.toLocaleString()}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  )
}
