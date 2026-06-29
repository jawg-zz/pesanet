"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import {
  Activity,
  Download,
  FileBarChart,
  Loader2,
  Receipt,
  Ticket,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"
import type { RevenuePoint } from "@/lib/types"
import { formatKES } from "@/lib/wifi-utils"
import { useToast } from "@/hooks/use-toast"

interface Summary {
  totalRevenue: number
  totalSessions: number
  totalCustomers: number
  avgRevenuePerSession: number
  totalVouchersSold: number
  totalDiscountGiven: number
  byPackage: { packageName: string; count: number; revenue: number }[]
  byDay: RevenuePoint[]
}

export function ReportsManager() {
  const { toast } = useToast()
  const [summary, setSummary] = useState<Summary | null>(null)
  const [loading, setLoading] = useState(true)
  const [days, setDays] = useState<number>(30)

  async function load() {
    setLoading(true)
    try {
      const res = await fetch(`/api/reports/summary?days=${days}`)
      if (!res.ok) throw new Error("Failed to load reports")
      const data = (await res.json()) as { summary: Summary }
      setSummary(data.summary)
    } catch {
      toast({
        title: "Error",
        description: "Could not load reports.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [days])

  // Build export URL with optional from/to dates.
  const [from, setFrom] = useState("")
  const [to, setTo] = useState("")

  function exportUrl(base: string) {
    const params = new URLSearchParams()
    if (from) params.set("from", new Date(from).toISOString())
    if (to) {
      // include the full end-of-day for `to`
      const end = new Date(to)
      end.setHours(23, 59, 59, 999)
      params.set("to", end.toISOString())
    }
    const q = params.toString()
    return q ? `${base}?${q}` : base
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Header card with controls */}
      <Card className="py-0">
        <CardHeader className="flex-col gap-3 px-5 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileBarChart className="size-4 text-primary" />
              Reports & Exports
            </CardTitle>
            <CardDescription>
              Last {days} days · {summary ? formatKES(summary.totalRevenue) : "…"} revenue
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Label htmlFor="rep-days" className="sr-only">
              Days
            </Label>
            <div className="flex items-center gap-1 rounded-md border bg-muted/40 p-1">
              {[7, 30, 90].map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDays(d)}
                  className={
                    "rounded px-2.5 py-1 text-xs font-medium transition " +
                    (days === d
                      ? "bg-background shadow-sm text-foreground"
                      : "text-muted-foreground hover:text-foreground")
                  }
                >
                  {d}d
                </button>
              ))}
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={load}
              aria-label="Refresh"
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <FileBarChart className="size-4" />
              )}
            </Button>
          </div>
        </CardHeader>
      </Card>

      {loading || !summary ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-xl" />
            ))}
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <Skeleton className="h-72 rounded-xl" />
            <Skeleton className="h-72 rounded-xl" />
          </div>
        </>
      ) : (
        <>
          {/* Stat cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <StatCard
              icon={<Wallet className="size-5" />}
              label="Total Revenue"
              value={formatKES(summary.totalRevenue)}
              tone="emerald"
              delay={0}
            />
            <StatCard
              icon={<Activity className="size-5" />}
              label="Total Sessions"
              value={String(summary.totalSessions)}
              tone="primary"
              delay={0.05}
            />
            <StatCard
              icon={<TrendingUp className="size-5" />}
              label="Avg / Session"
              value={formatKES(summary.avgRevenuePerSession)}
              tone="amber"
              delay={0.1}
            />
            <StatCard
              icon={<Ticket className="size-5" />}
              label="Vouchers Sold"
              value={String(summary.totalVouchersSold)}
              tone="primary"
              delay={0.15}
            />
            <StatCard
              icon={<Receipt className="size-5" />}
              label="Discounts Given"
              value={formatKES(summary.totalDiscountGiven)}
              tone="amber"
              delay={0.2}
            />
          </div>

          {/* Charts */}
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Revenue by package */}
            <Card className="py-0">
              <CardHeader className="px-5 pt-5">
                <CardTitle className="flex items-center gap-2 text-base">
                  <FileBarChart className="size-4 text-primary" />
                  Revenue by package
                </CardTitle>
                <CardDescription>
                  {summary.byPackage.length} packages sold in last {days}d
                </CardDescription>
              </CardHeader>
              <CardContent className="px-2 pb-4 sm:px-4">
                <div className="h-72 w-full">
                  {summary.byPackage.length === 0 ? (
                    <EmptyChart label="No package sales in this period." />
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={summary.byPackage}
                        margin={{ top: 10, right: 16, left: 0, bottom: 0 }}
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="oklch(0.9 0.01 150)"
                          vertical={false}
                        />
                        <XAxis
                          dataKey="packageName"
                          tick={{ fontSize: 10 }}
                          stroke="oklch(0.5 0.02 150)"
                          interval={0}
                          angle={-15}
                          textAnchor="end"
                          height={60}
                        />
                        <YAxis
                          tick={{ fontSize: 11 }}
                          stroke="oklch(0.5 0.02 150)"
                          tickFormatter={(v) => `KES ${(v / 1000).toFixed(0)}k`}
                        />
                        <Tooltip
                          formatter={(v: number, name: string) =>
                            name === "revenue"
                              ? [formatKES(v), "Revenue"]
                              : [v, "Sold"]
                          }
                          contentStyle={{
                            borderRadius: 12,
                            border: "1px solid oklch(0.9 0.01 150)",
                            fontSize: 12,
                          }}
                        />
                        <Bar
                          dataKey="revenue"
                          fill="oklch(0.55 0.16 150)"
                          radius={[6, 6, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Revenue by day */}
            <Card className="py-0">
              <CardHeader className="px-5 pt-5">
                <CardTitle className="flex items-center gap-2 text-base">
                  <TrendingUp className="size-4 text-primary" />
                  Revenue by day
                </CardTitle>
                <CardDescription>
                  {summary.byDay.length} day{summary.byDay.length === 1 ? "" : "s"} of data
                </CardDescription>
              </CardHeader>
              <CardContent className="px-2 pb-4 sm:px-4">
                <div className="h-72 w-full">
                  {summary.byDay.length === 0 ? (
                    <EmptyChart label="No revenue data in this period." />
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={summary.byDay}
                        margin={{ top: 10, right: 16, left: 0, bottom: 0 }}
                      >
                        <defs>
                          <linearGradient id="repGrad" x1="0" y1="0" x2="0" y2="1">
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
                          fill="url(#repGrad)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Exports */}
          <Card className="py-0">
            <CardHeader className="px-5 pt-5">
              <CardTitle className="flex items-center gap-2 text-base">
                <Download className="size-4 text-primary" />
                Export data (CSV)
              </CardTitle>
              <CardDescription>
                Download raw data as CSV files. Optional date range applies to
                transactions &amp; sessions exports.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4 px-5 pb-5">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="exp-from">From (optional)</Label>
                  <Input
                    id="exp-from"
                    type="date"
                    value={from}
                    onChange={(e) => setFrom(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="exp-to">To (optional)</Label>
                  <Input
                    id="exp-to"
                    type="date"
                    value={to}
                    onChange={(e) => setTo(e.target.value)}
                  />
                </div>
                <div className="sm:col-span-2 lg:col-span-2" />
              </div>
              <Separator />
              <div className="grid gap-3 sm:grid-cols-3">
                <ExportButton
                  href={exportUrl("/api/reports/transactions")}
                  icon={<Receipt className="size-4" />}
                  title="Transactions"
                  description="All M-Pesa & voucher transactions"
                />
                <ExportButton
                  href={exportUrl("/api/reports/sessions")}
                  icon={<Activity className="size-4" />}
                  title="Sessions"
                  description="All WiFi sessions"
                />
                <ExportButton
                  href="/api/reports/customers"
                  icon={<Users className="size-4" />}
                  title="Customers"
                  description="All customer accounts"
                />
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}

function EmptyChart({ label }: { label: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground">
      <FileBarChart className="size-6" />
      <p className="text-sm">{label}</p>
    </div>
  )
}

function ExportButton({
  href,
  icon,
  title,
  description,
}: {
  href: string
  icon: React.ReactNode
  title: string
  description: string
}) {
  return (
    <a
      href={href}
      download
      className="group flex items-start gap-3 rounded-xl border bg-card p-4 transition hover:border-primary/40 hover:shadow-sm"
    >
      <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary transition group-hover:bg-primary group-hover:text-primary-foreground">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="flex items-center gap-1.5 font-semibold">
          {title}
          <Download className="size-3.5 text-muted-foreground transition group-hover:text-primary-foreground" />
        </p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </a>
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
      <Card className="h-full py-0">
        <CardContent className="flex flex-col gap-2 p-5">
          <div className={`grid size-10 place-items-center rounded-lg ${toneClass}`}>
            {icon}
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="truncate text-lg font-bold tracking-tight">{value}</p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
