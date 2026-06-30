"use client"

import { useEffect, useMemo, useState } from "react"
import { motion } from "framer-motion"
import {
  Award,
  CheckCircle2,
  Copy,
  Gift,
  Loader2,
  Minus,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Ticket,
  TrendingUp,
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
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import type {
  LoyaltySummary,
  PointsLedgerEntry,
  ReferralEntry,
  RedeemOption,
  WifiPackage,
} from "@/lib/types"
import {
  formatKES,
  pointsCostForPackage,
  pointsToNextTier,
  tierLabel,
  timeAgo,
} from "@/lib/wifi-utils"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"

const TIER_ORDER = ["bronze", "silver", "gold", "platinum"] as const

function tierClasses(tier: string): string {
  switch (tier) {
    case "platinum":
      return "border-transparent bg-gradient-to-r from-emerald-500/20 to-emerald-700/20 text-emerald-700 dark:text-emerald-300"
    case "gold":
      return "border-transparent bg-amber-500/15 text-amber-700 dark:text-amber-300"
    case "silver":
      return "border-transparent bg-slate-500/15 text-slate-700 dark:text-slate-300"
    default:
      return "border-transparent bg-muted text-muted-foreground"
  }
}

function tierBarColor(tier: string): string {
  switch (tier) {
    case "platinum":
      return "bg-emerald-500"
    case "gold":
      return "bg-amber-500"
    case "silver":
      return "bg-slate-500"
    default:
      return "bg-muted-foreground/60"
  }
}

export function LoyaltyManager() {
  const { toast } = useToast()
  const [members, setMembers] = useState<LoyaltySummary[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")

  async function load() {
    setLoading(true)
    try {
      const res = await fetch("/api/loyalty?limit=100")
      if (!res.ok) throw new Error("Failed to load loyalty")
      const data = (await res.json()) as { loyalty: LoyaltySummary[] }
      setMembers(data.loyalty ?? [])
    } catch {
      toast({
        title: "Error",
        description: "Could not load loyalty members.",
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
    const totalMembers = members.length
    const pointsInCirculation = members.reduce(
      (s, m) => s + (m.pointsBalance ?? 0),
      0
    )
    const topTier = members.filter(
      (m) => m.tier === "platinum" || m.tier === "gold"
    ).length
    const tierCounts = TIER_ORDER.map((t) => ({
      tier: t,
      count: members.filter((m) => m.tier === t).length,
    }))
    const maxTierCount = Math.max(1, ...tierCounts.map((t) => t.count))
    return {
      totalMembers,
      pointsInCirculation,
      topTier,
      tierCounts,
      maxTierCount,
    }
  }, [members])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return members
    return members.filter(
      (m) =>
        m.phone.toLowerCase().includes(q) ||
        (m.name ?? "").toLowerCase().includes(q) ||
        (m.referralCode ?? "").toLowerCase().includes(q)
    )
  }, [members, search])

  return (
    <div className="flex flex-col gap-5">
      {/* Summary */}
      <div className="grid gap-4 sm:grid-cols-3">
        <SummaryCard
          icon={<Users className="size-4" />}
          label="Loyalty members"
          value={summary.totalMembers.toString()}
          tone="primary"
        />
        <SummaryCard
          icon={<Sparkles className="size-4" />}
          label="Points in circulation"
          value={summary.pointsInCirculation.toLocaleString("en-KE")}
          tone="emerald"
        />
        <SummaryCard
          icon={<Award className="size-4" />}
          label="Gold + Platinum"
          value={summary.topTier.toString()}
          tone="amber"
        />
      </div>

      {/* Tier distribution */}
      <Card className="py-0">
        <CardHeader className="px-5 pt-5">
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="size-4 text-primary" />
            Tier distribution
          </CardTitle>
        </CardHeader>
        <CardContent className="px-5 pb-5">
          {loading ? (
            <div className="grid gap-3 sm:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-20 rounded-lg" />
              ))}
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-4">
              {summary.tierCounts.map((t) => (
                <div
                  key={t.tier}
                  className="flex flex-col gap-2 rounded-lg border bg-muted/30 p-3"
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-xs font-semibold capitalize",
                        tierClasses(t.tier)
                      )}
                    >
                      {t.tier}
                    </span>
                    <span className="font-mono text-sm font-bold tabular-nums">
                      {t.count}
                    </span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all",
                        tierBarColor(t.tier)
                      )}
                      style={{
                        width: `${
                          (t.count / summary.maxTierCount) * 100
                        }%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Members table */}
      <Card className="py-0">
        <CardHeader className="flex-col gap-3 px-5 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Award className="size-4 text-primary" />
              Loyalty members
              <span className="text-sm font-normal text-muted-foreground">
                ({filtered.length})
              </span>
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Click a row to view ledger, referrals, and adjust points.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search phone, name, code…"
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
              <Award className="size-6 text-muted-foreground" />
              <p className="text-sm font-medium">No loyalty members yet</p>
              <p className="text-xs text-muted-foreground">
                Members appear here once they earn points on purchases.
              </p>
            </div>
          ) : (
            <div className="max-h-[60vh] overflow-auto custom-scroll rounded-lg border">
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-card">
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Tier</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                    <TableHead className="hidden text-right sm:table-cell">
                      Lifetime
                    </TableHead>
                    <TableHead className="hidden text-right md:table-cell">
                      Referrals
                    </TableHead>
                    <TableHead className="hidden md:table-cell">
                      Code
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((m, i) => (
                    <MemberRow key={m.customerId} m={m} index={i} onUpdated={load} />
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

function MemberRow({
  m,
  index,
  onUpdated,
}: {
  m: LoyaltySummary
  index: number
  onUpdated: () => void
}) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <motion.tr
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: Math.min(index * 0.02, 0.2) }}
        onClick={() => setOpen(true)}
        className="cursor-pointer hover:bg-muted/50"
      >
        <TableCell>
          <div className="flex flex-col">
            <span className="font-medium">{m.name ?? "—"}</span>
            <span className="font-mono text-xs text-muted-foreground">
              {m.phone}
            </span>
          </div>
        </TableCell>
        <TableCell>
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-xs font-semibold capitalize",
              tierClasses(m.tier)
            )}
          >
            {m.tier}
          </span>
        </TableCell>
        <TableCell className="text-right font-mono tabular-nums">
          {m.pointsBalance.toLocaleString("en-KE")}
        </TableCell>
        <TableCell className="hidden text-right font-mono tabular-nums text-muted-foreground sm:table-cell">
          {m.lifetimePoints.toLocaleString("en-KE")}
        </TableCell>
        <TableCell className="hidden text-right tabular-nums md:table-cell">
          {m.referralsCompleted}
          <span className="text-muted-foreground"> / {m.referralsCount}</span>
        </TableCell>
        <TableCell className="hidden md:table-cell">
          {m.referralCode ? (
            <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
              {m.referralCode}
            </span>
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          )}
        </TableCell>
      </motion.tr>
      <MemberDetailDialog
        open={open}
        onOpenChange={setOpen}
        customerId={m.customerId}
        onUpdated={onUpdated}
      />
    </>
  )
}

function MemberDetailDialog({
  open,
  onOpenChange,
  customerId,
  onUpdated,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  customerId: string
  onUpdated: () => void
}) {
  const { toast } = useToast()
  const [summary, setSummary] = useState<LoyaltySummary | null>(null)
  const [ledger, setLedger] = useState<PointsLedgerEntry[]>([])
  const [referrals, setReferrals] = useState<ReferralEntry[]>([])
  const [packages, setPackages] = useState<WifiPackage[]>([])
  const [loading, setLoading] = useState(false)
  const [tab, setTab] = useState<"ledger" | "redeem">("ledger")
  const [adjust, setAdjust] = useState("")
  const [reason, setReason] = useState("")
  const [adjusting, setAdjusting] = useState(false)
  const [redeemingId, setRedeemingId] = useState<string | null>(null)
  const [lastVoucher, setLastVoucher] = useState<string | null>(null)

  async function loadDetail() {
    setLoading(true)
    try {
      const res = await fetch(`/api/loyalty/${customerId}`)
      if (!res.ok) throw new Error("Failed to load")
      const data = await res.json()
      setSummary(data.summary ?? null)
      setLedger(data.ledger ?? [])
      setReferrals(data.referrals ?? [])
    } catch {
      /* ignore */
    } finally {
      setLoading(false)
    }
  }

  async function loadPackages() {
    try {
      const res = await fetch("/api/packages?active=true")
      if (!res.ok) return
      const data = await res.json()
      setPackages(data.packages ?? [])
    } catch {
      /* ignore */
    }
  }

  useEffect(() => {
    if (open) {
      loadDetail()
      loadPackages()
      setLastVoucher(null)
      setAdjust("")
      setReason("")
      setTab("ledger")
    }
  }, [open, customerId])

  async function doAdjust() {
    const pts = parseInt(adjust, 10)
    if (Number.isNaN(pts) || pts === 0) {
      toast({
        title: "Invalid amount",
        description: "Enter a non-zero integer (use -50 to subtract).",
        variant: "destructive",
      })
      return
    }
    if (!reason.trim()) {
      toast({
        title: "Reason required",
        description: "Add a short reason for the adjustment.",
        variant: "destructive",
      })
      return
    }
    setAdjusting(true)
    try {
      const res = await fetch(`/api/loyalty/${customerId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pointsAdjust: pts,
          reason: reason.trim(),
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data.error || "Could not adjust points")
      }
      setSummary(data.summary ?? null)
      toast({
        title: "Points adjusted",
        description: `${pts > 0 ? "+" : ""}${pts} points · ${reason.trim()}`,
      })
      setAdjust("")
      setReason("")
      await loadDetail()
      onUpdated()
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Adjust failed"
      toast({
        title: "Error",
        description: msg,
        variant: "destructive",
      })
    } finally {
      setAdjusting(false)
    }
  }

  async function doRedeem(pkg: WifiPackage) {
    if (!summary) return
    setRedeemingId(pkg.id)
    setLastVoucher(null)
    try {
      const res = await fetch("/api/loyalty/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: summary.phone,
          packageId: pkg.id,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data.error || "Could not redeem points")
      }
      setLastVoucher(data.voucher?.code ?? null)
      toast({
        title: "Voucher issued 🎉",
        description: `${pkg.name} redeemed · ${data.pointsBalance ?? summary.pointsBalance - pointsCostForPackage(pkg.priceKES)} pts left.`,
      })
      await loadDetail()
      onUpdated()
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Redeem failed"
      toast({
        title: "Redeem failed",
        description: msg,
        variant: "destructive",
      })
    } finally {
      setRedeemingId(null)
    }
  }

  const redeemOptions: RedeemOption[] = useMemo(() => {
    if (!summary) return []
    return packages.map((p) => {
      const cost = pointsCostForPackage(p.priceKES)
      return {
        packageId: p.id,
        packageName: p.name,
        priceKES: p.priceKES,
        pointsCost: cost,
        affordable: summary.pointsBalance >= cost,
      }
    })
  }, [packages, summary])

  const tierInfo = summary
    ? pointsToNextTier(summary.lifetimePoints)
    : null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-hidden sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Award className="size-4 text-primary" />
            Loyalty member
          </DialogTitle>
          <DialogDescription>
            View ledger, adjust points, or redeem for a free voucher.
          </DialogDescription>
        </DialogHeader>

        {loading || !summary ? (
          <div className="flex flex-col gap-3">
            <Skeleton className="h-24 rounded-lg" />
            <Skeleton className="h-48 rounded-lg" />
          </div>
        ) : (
          <div className="flex max-h-[65vh] flex-col gap-4 overflow-y-auto custom-scroll pr-1">
            {/* Member header */}
            <div className="flex flex-col gap-3 rounded-lg border bg-muted/30 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "grid size-12 place-items-center rounded-xl",
                    tierClasses(summary.tier)
                  )}
                >
                  <Award className="size-5" />
                </div>
                <div>
                  <p className="font-semibold">
                    {summary.name ?? "—"}
                  </p>
                  <p className="font-mono text-xs text-muted-foreground">
                    {summary.phone}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                <MiniStat label="Tier" value={tierLabel(summary.tier)} />
                <MiniStat
                  label="Balance"
                  value={summary.pointsBalance.toLocaleString("en-KE")}
                />
                <MiniStat
                  label="Lifetime"
                  value={summary.lifetimePoints.toLocaleString("en-KE")}
                />
              </div>
            </div>

            {/* Tier progress */}
            {tierInfo?.nextTier && (
              <div className="rounded-lg border p-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">
                    Progress to{" "}
                    <span className="font-semibold capitalize">
                      {tierInfo.nextTier}
                    </span>
                  </span>
                  <span className="font-mono">
                    {tierInfo.pointsToNextTier.toLocaleString("en-KE")} pts to go
                  </span>
                </div>
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{
                      width: `${Math.min(
                        100,
                        Math.max(
                          5,
                          (summary.lifetimePoints /
                            (summary.lifetimePoints +
                              tierInfo.pointsToNextTier)) *
                            100
                        )
                      )}%`,
                    }}
                  />
                </div>
              </div>
            )}

            {/* Referral code */}
            {summary.referralCode && (
              <div className="flex items-center justify-between rounded-lg border bg-emerald-500/5 p-3">
                <div className="flex items-center gap-2">
                  <Gift className="size-4 text-primary" />
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Referral code
                    </p>
                    <p className="font-mono text-sm font-semibold">
                      {summary.referralCode}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard?.writeText(summary.referralCode!)
                    toast({ title: "Code copied" })
                  }}
                >
                  <Copy className="size-3.5" />
                  Copy
                </Button>
              </div>
            )}

            <Tabs value={tab} onValueChange={(v) => setTab(v as "ledger" | "redeem")}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="ledger">Points ledger</TabsTrigger>
                <TabsTrigger value="redeem">Redeem for customer</TabsTrigger>
              </TabsList>
            </Tabs>

            {tab === "ledger" ? (
              <>
                {ledger.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed bg-muted/30 py-8 text-center">
                    <Ticket className="size-5 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      No points transactions yet.
                    </p>
                  </div>
                ) : (
                  <ul className="flex max-h-64 flex-col gap-1 overflow-y-auto custom-scroll">
                    {ledger.map((e) => {
                      const positive = e.points >= 0
                      return (
                        <li
                          key={e.id}
                          className="flex items-center justify-between gap-3 rounded-md border bg-card px-3 py-2 text-sm"
                        >
                          <div className="flex min-w-0 items-center gap-2">
                            <span
                              className={cn(
                                "grid size-7 shrink-0 place-items-center rounded-full",
                                positive
                                  ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300"
                                  : "bg-amber-500/15 text-amber-600 dark:text-amber-300"
                              )}
                            >
                              {positive ? (
                                <Plus className="size-3.5" />
                              ) : (
                                <Minus className="size-3.5" />
                              )}
                            </span>
                            <div className="min-w-0">
                              <p className="truncate font-medium">{e.reason}</p>
                              <p className="text-xs text-muted-foreground">
                                <span className="capitalize">{e.type.replace(/_/g, " ")}</span>
                                {" · "}
                                {timeAgo(e.createdAt)}
                              </p>
                            </div>
                          </div>
                          <span
                            className={cn(
                              "shrink-0 font-mono font-semibold tabular-nums",
                              positive
                                ? "text-emerald-600 dark:text-emerald-400"
                                : "text-amber-600 dark:text-amber-400"
                            )}
                          >
                            {positive ? "+" : ""}
                            {e.points}
                          </span>
                        </li>
                      )
                    })}
                  </ul>
                )}

                {/* Referrals made */}
                {referrals.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Referrals ({referrals.length})
                      </p>
                      <ul className="flex flex-col gap-1.5">
                        {referrals.map((r) => (
                          <li
                            key={r.id}
                            className="flex items-center justify-between gap-3 rounded-md border bg-card px-3 py-2 text-sm"
                          >
                            <div>
                              <p className="font-mono text-xs">
                                {r.referredPhone}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {r.referredName ?? "—"}
                                {" · "}
                                {timeAgo(r.createdAt)}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs text-emerald-600 dark:text-emerald-400">
                                +{r.rewardPoints}
                              </span>
                              <Badge
                                variant="outline"
                                className={cn(
                                  r.status === "completed"
                                    ? "border-transparent bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                                    : "border-transparent bg-amber-500/15 text-amber-700 dark:text-amber-300"
                                )}
                              >
                                {r.status}
                              </Badge>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </>
                )}

                <Separator />

                {/* Adjust points */}
                <div className="rounded-lg border p-3">
                  <p className="mb-2 flex items-center gap-2 text-sm font-semibold">
                    <Sparkles className="size-3.5 text-primary" />
                    Adjust points
                  </p>
                  <div className="grid gap-2 sm:grid-cols-[120px_1fr]">
                    <Input
                      type="number"
                      placeholder="±50"
                      value={adjust}
                      onChange={(e) => setAdjust(e.target.value)}
                      className="font-mono"
                    />
                    <Input
                      placeholder="Reason (e.g. goodwill credit)"
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                    />
                  </div>
                  <div className="mt-2 flex justify-end">
                    <Button
                      size="sm"
                      onClick={doAdjust}
                      disabled={adjusting}
                    >
                      {adjusting ? (
                        <>
                          <Loader2 className="size-3.5 animate-spin" />
                          Applying…
                        </>
                      ) : (
                        <>
                          <Sparkles className="size-3.5" />
                          Apply adjustment
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex flex-col gap-3">
                {lastVoucher && (
                  <div className="flex items-center justify-between rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-3">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" />
                      <div>
                        <p className="text-xs text-muted-foreground">
                          Voucher issued
                        </p>
                        <p className="font-mono text-sm font-bold tracking-wide">
                          {lastVoucher}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        navigator.clipboard?.writeText(lastVoucher)
                        toast({ title: "Voucher copied" })
                      }}
                    >
                      <Copy className="size-3.5" />
                      Copy
                    </Button>
                  </div>
                )}
                {redeemOptions.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed bg-muted/30 py-8 text-center">
                    <Gift className="size-5 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      No active packages available to redeem.
                    </p>
                  </div>
                ) : (
                  <ul className="flex flex-col gap-2">
                    {redeemOptions.map((opt) => (
                      <li
                        key={opt.packageId}
                        className={cn(
                          "flex items-center justify-between gap-3 rounded-lg border p-3 transition-colors",
                          opt.affordable
                            ? "border-emerald-500/30 bg-emerald-500/5"
                            : "border-border bg-muted/30 opacity-70"
                        )}
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <div
                            className={cn(
                              "grid size-9 place-items-center rounded-lg",
                              opt.affordable
                                ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300"
                                : "bg-muted text-muted-foreground"
                            )}
                          >
                            <Ticket className="size-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="truncate font-medium">
                              {opt.packageName}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatKES(opt.priceKES)} ·{" "}
                              <span className="font-mono">
                                {opt.pointsCost.toLocaleString("en-KE")} pts
                              </span>
                            </p>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          disabled={
                            !opt.affordable || redeemingId === opt.packageId
                          }
                          onClick={() => {
                            const pkg = packages.find(
                              (p) => p.id === opt.packageId
                            )
                            if (pkg) doRedeem(pkg)
                          }}
                        >
                          {redeemingId === opt.packageId ? (
                            <Loader2 className="size-3.5 animate-spin" />
                          ) : (
                            <Gift className="size-3.5" />
                          )}
                          Redeem
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
                <p className="text-xs text-muted-foreground">
                  Redemption issues a voucher code worth one free package. Points
                  cost is 10× the KES price (min 50).
                </p>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-card px-2.5 py-1.5 text-center">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="truncate text-sm font-bold">{value}</p>
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
