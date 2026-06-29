"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import {
  Activity,
  Megaphone,
  PieChart as PieChartIcon,
  Receipt,
  Star,
  TrendingUp,
  Users,
  Wallet,
  Wifi,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { StatusBadge } from "@/components/wifi/status-badge"
import type {
  AdminStats,
  AnalyticsData,
  RevenuePoint,
  WifiSession,
  WifiTransaction,
} from "@/lib/types"
import { formatKES, timeAgo } from "@/lib/wifi-utils"

const PIE_COLORS = [
  "#15803d", // emerald-700
  "#16a34a", // emerald-600
  "#22c55e", // emerald-500
  "#65a30d", // lime-600
  "#84cc16", // lime-500
  "#10b981", // emerald-400
]

export function AdminOverview() {
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [revenue, setRevenue] = useState<RevenuePoint[]>([])
  const [recentSessions, setRecentSessions] = useState<WifiSession[]>([])
  const [recentTx, setRecentTx] = useState<WifiTransaction[]>([])
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    async function load() {
      setLoading(true)
      try {
        const [s, r, tx, an] = await Promise.all([
          fetch("/api/admin/stats").then((r) => r.json() as Promise<AdminStats>),
          fetch("/api/admin/revenue?days=7")
            .then((r) => r.json() as Promise<{ data: RevenuePoint[] }>),
          fetch("/api/transactions?limit=5")
            .then((r) => r.json() as Promise<{ transactions: WifiTransaction[] }>),
          fetch("/api/admin/analytics?days=30")
            .then((r) => r.json() as Promise<{ analytics: AnalyticsData }>)
            .catch(() => ({ analytics: null as AnalyticsData | null })),
        ])
        if (!active) return
        setStats(s)
        setRevenue(r.data ?? [])
        setRecentTx(tx.transactions ?? [])
        setAnalytics(an.analytics ?? null)
        // Fetch recent sessions for the table.
        try {
          const sRes = await fetch("/api/sessions?status=active")
          if (sRes.ok) {
            const sData = (await sRes.json()) as { sessions: WifiSession[] }
            setRecentSessions((sData.sessions ?? []).slice(0, 5))
          }
        } catch {
          /* ignore */
        }
      } catch {
        /* ignore */
      } finally {
        if (active) setLoading(false)
      }
    }
    load()
    return () => {
      active = false
    }
  }, [])

  if (loading) {
    return (
      <div className="flex flex-col gap-5">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-72 rounded-xl" />
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-64 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      </div>
    )
  }

  const totalRevenue7d = revenue.reduce((s, p) => s + p.revenue, 0)
  const totalSessions7d = revenue.reduce((s, p) => s + p.sessions, 0)

  return (
    <div className="flex flex-col gap-5">
      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={<Wifi className="size-5" />}
          label="Active Sessions"
          value={stats?.activeSessions?.toString() ?? "0"}
          tone="primary"
          delay={0}
        />
        <StatCard
          icon={<TrendingUp className="size-5" />}
          label="Today's Revenue"
          value={formatKES(stats?.todayRevenue ?? 0)}
          tone="emerald"
          delay={0.05}
        />
        <StatCard
          icon={<Users className="size-5" />}
          label="Total Customers"
          value={(stats?.totalCustomers ?? 0).toString()}
          tone="amber"
          delay={0.1}
        />
        <StatCard
          icon={<Wallet className="size-5" />}
          label="Total Revenue"
          value={formatKES(stats?.totalRevenue ?? 0)}
          tone="emerald"
          delay={0.15}
        />
      </div>

      {/* Secondary stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MiniStat
          label="Sessions today"
          value={stats?.todaySessions ?? 0}
          icon={<Activity className="size-4" />}
        />
        <MiniStat
          label="Unused vouchers"
          value={stats?.vouchersUnused ?? 0}
          icon={<Receipt className="size-4" />}
        />
        <MiniStat
          label="Avg rating"
          value={
            <span className="flex items-center gap-1">
              <Star className="size-3.5 fill-amber-400 text-amber-400" />
              {(stats?.avgRating ?? 0).toFixed(1)}
              <span className="text-xs font-normal text-muted-foreground">
                / 5
              </span>
            </span>
          }
          icon={<Star className="size-4" />}
        />
        <MiniStat
          label="Active announcements"
          value={stats?.activeAnnouncements ?? 0}
          icon={<Megaphone className="size-4" />}
        />
      </div>

      {/* Revenue chart + Package popularity */}
      <div className="grid gap-4 lg:grid-cols-3">
      <Card className="py-0 lg:col-span-2">
        <CardHeader className="flex-row items-center justify-between px-5 pt-5">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="size-4 text-primary" />
              Revenue — last 7 days
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              {formatKES(totalRevenue7d)} collected · {totalSessions7d} sessions
            </p>
          </div>
        </CardHeader>
        <CardContent className="px-2 pb-4 sm:px-4">
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={revenue}
                margin={{ top: 10, right: 16, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="oklch(0.55 0.16 150)" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="oklch(0.55 0.16 150)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="oklch(0.9 0.01 150)"
                  vertical={false}
                />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11 }}
                  stroke="oklch(0.5 0.02 150)"
                />
                <YAxis
                  tick={{ fontSize: 11 }}
                  stroke="oklch(0.5 0.02 150)"
                  tickFormatter={(v) => `KES ${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  formatter={(v: number) => [formatKES(v), "Revenue"]}
                  labelFormatter={(l) => `${l}`}
                  contentStyle={{
                    borderRadius: 12,
                    border: "1px solid oklch(0.9 0.01 150)",
                    fontSize: 12,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="oklch(0.55 0.16 150)"
                  strokeWidth={2}
                  fill="url(#revGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

        {/* Package popularity donut */}
        <Card className="py-0">
          <CardHeader className="px-5 pt-5">
            <CardTitle className="flex items-center gap-2 text-base">
              <PieChartIcon className="size-4 text-primary" />
              Package popularity
            </CardTitle>
            <p className="text-xs text-muted-foreground">Last 30 days · by sessions</p>
          </CardHeader>
          <CardContent className="px-2 pb-4 sm:px-4">
            <div className="h-72 w-full">
              {!analytics || analytics.packagePopularity.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground">
                  <PieChartIcon className="size-6" />
                  <p className="text-sm">No package data yet.</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={analytics.packagePopularity
                        .slice(0, 6)
                        .map((p) => ({
                          name: p.packageName,
                          value: p.count,
                        }))}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={90}
                      paddingAngle={2}
                      stroke="none"
                    >
                      {analytics.packagePopularity
                        .slice(0, 6)
                        .map((_, i) => (
                          <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                    </Pie>
                    <Tooltip
                      formatter={(v: number, n: string) => [`${v} sessions`, n]}
                      contentStyle={{
                        borderRadius: 12,
                        border: "1px solid oklch(0.9 0.01 150)",
                        fontSize: 12,
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
            {analytics && analytics.packagePopularity.length > 0 && (
              <ul className="mt-2 flex flex-col gap-1.5">
                {analytics.packagePopularity.slice(0, 5).map((p, i) => (
                  <li
                    key={p.packageName}
                    className="flex items-center justify-between text-xs"
                  >
                    <span className="flex items-center gap-2 truncate">
                      <span
                        className="size-2.5 shrink-0 rounded-full"
                        style={{
                          backgroundColor: PIE_COLORS[i % PIE_COLORS.length],
                        }}
                      />
                      <span className="truncate">{p.packageName}</span>
                    </span>
                    <span className="ml-2 shrink-0 font-mono tabular-nums text-muted-foreground">
                      {p.count}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent activity */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="py-0">
          <CardHeader className="px-5 pt-5">
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="size-4 text-primary" />
              Recent active sessions
            </CardTitle>
          </CardHeader>
          <CardContent className="px-2 pb-3">
            {recentSessions.length === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                No active sessions right now.
              </p>
            ) : (
              <ul className="flex flex-col">
                {recentSessions.map((s) => (
                  <li
                    key={s.id}
                    className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm hover:bg-muted/40"
                  >
                    <div className="flex min-w-0 flex-col">
                      <span className="truncate font-medium">
                        {s.packageName}
                      </span>
                      <span className="truncate text-xs text-muted-foreground">
                        {s.phone} · {timeAgo(s.startTime)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {formatKES(s.priceKES)}
                      </span>
                      <StatusBadge status={s.status} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="py-0">
          <CardHeader className="px-5 pt-5">
            <CardTitle className="flex items-center gap-2 text-base">
              <Receipt className="size-4 text-primary" />
              Recent transactions
            </CardTitle>
          </CardHeader>
          <CardContent className="px-2 pb-3">
            {recentTx.length === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                No transactions yet.
              </p>
            ) : (
              <ul className="flex flex-col">
                {recentTx.map((t) => (
                  <li
                    key={t.id}
                    className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm hover:bg-muted/40"
                  >
                    <div className="flex min-w-0 flex-col">
                      <span className="truncate font-medium">
                        {t.packageName ?? "Voucher"}
                      </span>
                      <span className="truncate text-xs text-muted-foreground">
                        {t.phone} · {timeAgo(t.createdAt)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-primary">
                        {formatKES(t.amountKES)}
                      </span>
                      <StatusBadge status={t.status} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function StatCard({
  icon,
  label,
  value,
  tone,
  delay = 0,
}: {
  icon: React.ReactNode
  label: string
  value: string
  tone: "primary" | "emerald" | "amber"
  delay?: number
}) {
  const toneClass =
    tone === "primary"
      ? "bg-primary/10 text-primary"
      : tone === "emerald"
      ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300"
      : "bg-amber-500/15 text-amber-600 dark:text-amber-300"
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
    >
      <Card className="py-0">
        <CardContent className="flex items-center gap-4 p-5">
          <div className={`grid size-12 place-items-center rounded-xl ${toneClass}`}>
            {icon}
          </div>
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="truncate text-xl font-bold tracking-tight">{value}</p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

function MiniStat({
  label,
  value,
  icon,
}: {
  label: string
  value: number | string | React.ReactNode
  icon: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border bg-muted/30 px-4 py-3">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        {icon}
        {label}
      </div>
      <span className="font-semibold tabular-nums">{value}</span>
    </div>
  )
}
