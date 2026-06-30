"use client"

import { useEffect, useMemo, useState } from "react"
import { motion } from "framer-motion"
import {
  CheckCircle2,
  Clock,
  Gift,
  Loader2,
  RefreshCw,
  Search,
  Share2,
  Sparkles,
  UserPlus,
  Users,
} from "lucide-react"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import { timeAgo } from "@/lib/wifi-utils"

interface ReferralRow {
  id: string
  referredPhone: string
  referredName: string | null
  status: string
  rewardPoints: number
  createdAt: string
  completedAt: string | null
  referrerName?: string | null
  referrerPhone?: string | null
}

function statusTone(status: string) {
  return status === "completed"
    ? "border-transparent bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
    : "border-transparent bg-amber-500/15 text-amber-700 dark:text-amber-300"
}

export function ReferralsManager() {
  const { toast } = useToast()
  const [referrals, setReferrals] = useState<ReferralRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")

  async function load() {
    setLoading(true)
    try {
      const res = await fetch("/api/referrals")
      if (!res.ok) throw new Error("Failed to load referrals")
      const data = await res.json()
      setReferrals((data.referrals ?? []) as ReferralRow[])
    } catch {
      toast({
        title: "Error",
        description: "Could not load referrals.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const summary = useMemo(() => {
    const total = referrals.length
    const completed = referrals.filter((r) => r.status === "completed").length
    const pending = referrals.filter((r) => r.status === "pending").length
    const totalPoints = referrals
      .filter((r) => r.status === "completed")
      .reduce((s, r) => s + (r.rewardPoints ?? 0), 0)
    return { total, completed, pending, totalPoints }
  }, [referrals])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return referrals
    return referrals.filter(
      (r) =>
        r.referredPhone.toLowerCase().includes(q) ||
        (r.referredName ?? "").toLowerCase().includes(q) ||
        (r.referrerPhone ?? "").toLowerCase().includes(q) ||
        (r.referrerName ?? "").toLowerCase().includes(q)
    )
  }, [referrals, search])

  return (
    <div className="flex flex-col gap-5">
      {/* Summary */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          icon={<Share2 className="size-4" />}
          label="Total referrals"
          value={summary.total.toString()}
          tone="primary"
        />
        <SummaryCard
          icon={<CheckCircle2 className="size-4" />}
          label="Completed"
          value={summary.completed.toString()}
          tone="emerald"
        />
        <SummaryCard
          icon={<Clock className="size-4" />}
          label="Pending"
          value={summary.pending.toString()}
          tone="amber"
        />
        <SummaryCard
          icon={<Gift className="size-4" />}
          label="Reward points given"
          value={summary.totalPoints.toLocaleString("en-KE")}
          tone="emerald"
        />
      </div>

      {/* Promo banner */}
      <Card className="overflow-hidden py-0">
        <div className="bg-gradient-to-r from-primary to-emerald-600 px-5 py-4 text-primary-foreground sm:px-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="grid size-9 place-items-center rounded-lg bg-white/15">
                <Sparkles className="size-4" />
              </div>
              <div>
                <p className="text-sm font-bold">Referral rewards program</p>
                <p className="text-xs text-primary-foreground/90">
                  Both referrer and friend earn <strong>100 bonus points</strong>{" "}
                  when a referral completes their first purchase.
                </p>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Referrals table */}
      <Card className="py-0">
        <CardHeader className="flex-col gap-3 px-5 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <UserPlus className="size-4 text-primary" />
              Referrals
              <span className="text-sm font-normal text-muted-foreground">
                ({filtered.length})
              </span>
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Track referrals made by your loyalty members.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by phone or name…"
                className="h-9 w-56 pl-8 text-sm"
              />
            </div>
            <Button variant="outline" size="icon" onClick={load} aria-label="Refresh">
              <RefreshCw className="size-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="px-2 pb-3 sm:px-4">
          {loading ? (
            <div className="flex flex-col gap-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full rounded-md" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed bg-muted/30 px-4 py-12 text-center">
              <UserPlus className="size-6 text-muted-foreground" />
              <p className="text-sm font-medium">No referrals yet</p>
              <p className="text-xs text-muted-foreground">
                When members refer friends who purchase, they&apos;ll appear here.
              </p>
            </div>
          ) : (
            <div className="max-h-[60vh] overflow-auto custom-scroll rounded-lg border">
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-card">
                  <TableRow>
                    <TableHead>Referrer</TableHead>
                    <TableHead>Referred</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Reward</TableHead>
                    <TableHead className="hidden text-right sm:table-cell">
                      Created
                    </TableHead>
                    <TableHead className="hidden text-right md:table-cell">
                      Completed
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((r, i) => (
                    <motion.tr
                      key={r.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: Math.min(i * 0.02, 0.2) }}
                      className="hover:bg-muted/50"
                    >
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">
                            {r.referrerName ?? "—"}
                          </span>
                          <span className="font-mono text-xs text-muted-foreground">
                            {r.referrerPhone ?? "—"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">
                            {r.referredName ?? "—"}
                          </span>
                          <span className="font-mono text-xs text-muted-foreground">
                            {r.referredPhone}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn("capitalize", statusTone(r.status))}
                        >
                          {r.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
                        +{r.rewardPoints ?? 0}
                      </TableCell>
                      <TableCell className="hidden text-right text-xs text-muted-foreground sm:table-cell">
                        {timeAgo(r.createdAt)}
                      </TableCell>
                      <TableCell className="hidden text-right text-xs text-muted-foreground md:table-cell">
                        {r.completedAt ? timeAgo(r.completedAt) : "—"}
                      </TableCell>
                    </motion.tr>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function SummaryCard({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode
  label: string
  value: string
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
        <div className={`grid size-11 place-items-center rounded-xl ${toneClass}`}>
          {icon}
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="truncate text-xl font-bold tabular-nums">{value}</p>
        </div>
      </CardContent>
    </Card>
  )
}
