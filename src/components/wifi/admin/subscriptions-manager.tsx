"use client"

import { useEffect, useMemo, useState } from "react"
import { motion } from "framer-motion"
import {
  CalendarClock,
  CheckCircle2,
  Clock,
  Loader2,
  Pause,
  Play,
  Plus,
  RefreshCw,
  Repeat,
  Smartphone,
  TrendingUp,
  XCircle,
  Zap,
} from "lucide-react"
import {
  Card,
  CardContent,
  CardDescription,
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
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import type { SubscriptionEntry, WifiPackage } from "@/lib/types"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { formatDateTime, formatKES, timeAgo } from "@/lib/wifi-utils"
import { validateKePhone } from "@/lib/wifi-utils"

type StatusFilter = "all" | "active" | "paused" | "cancelled"

function statusTone(status: string) {
  switch (status) {
    case "active":
      return "border-transparent bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
    case "paused":
      return "border-transparent bg-amber-500/15 text-amber-700 dark:text-amber-300"
    case "cancelled":
      return "border-transparent bg-muted text-muted-foreground"
    default:
      return "border-transparent bg-muted text-muted-foreground"
  }
}

export function SubscriptionsManager() {
  const { toast } = useToast()
  const [subs, setSubs] = useState<SubscriptionEntry[]>([])
  const [packages, setPackages] = useState<WifiPackage[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<StatusFilter>("all")
  const [processing, setProcessing] = useState(false)

  // Create dialog state
  const [createOpen, setCreateOpen] = useState(false)
  const [createPhone, setCreatePhone] = useState("")
  const [createPkg, setCreatePkg] = useState("")
  const [creating, setCreating] = useState(false)

  // Action target (pause/resume/cancel)
  const [actionTarget, setActionTarget] = useState<{
    sub: SubscriptionEntry
    action: "pause" | "resume" | "cancel"
  } | null>(null)
  const [acting, setActing] = useState(false)

  async function loadAll() {
    setLoading(true)
    try {
      const res = await fetch("/api/subscriptions")
      if (!res.ok) throw new Error("Failed to load")
      const data = await res.json()
      setSubs((data.subscriptions ?? []) as SubscriptionEntry[])
    } catch {
      toast({
        title: "Error",
        description: "Could not load subscriptions.",
        variant: "destructive",
      })
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
    loadAll()
    loadPackages()
  }, [])

  async function processDue() {
    setProcessing(true)
    try {
      const res = await fetch("/api/subscriptions/process", {
        method: "POST",
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data.error || "Could not process subscriptions")
      }
      toast({
        title: "Subscriptions processed",
        description: data.message || `Processed ${data.processed ?? 0} · ${formatKES(data.revenue ?? 0)}.`,
      })
      await loadAll()
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Process failed"
      toast({
        title: "Process failed",
        description: msg,
        variant: "destructive",
      })
    } finally {
      setProcessing(false)
    }
  }

  async function create() {
    if (!validateKePhone(createPhone)) {
      toast({
        title: "Invalid phone",
        description: "Enter a valid Kenyan number.",
        variant: "destructive",
      })
      return
    }
    if (!createPkg) {
      toast({
        title: "Select package",
        description: "Choose a package for this subscription.",
        variant: "destructive",
      })
      return
    }
    setCreating(true)
    try {
      const res = await fetch("/api/subscriptions/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: createPhone.trim(),
          packageId: createPkg,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data.error || "Could not create subscription")
      }
      toast({
        title: "Subscription created",
        description: data.message || "Auto-renewal enabled for this customer.",
      })
      setCreateOpen(false)
      setCreatePhone("")
      setCreatePkg("")
      await loadAll()
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Create failed"
      toast({
        title: "Create failed",
        description: msg,
        variant: "destructive",
      })
    } finally {
      setCreating(false)
    }
  }

  async function confirmAction() {
    if (!actionTarget) return
    setActing(true)
    try {
      const res = await fetch(`/api/subscriptions/${actionTarget.sub.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: actionTarget.action }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data.error || "Could not update subscription")
      }
      toast({
        title: "Subscription updated",
        description: `${actionTarget.sub.phone} → ${actionTarget.action}.`,
      })
      setActionTarget(null)
      await loadAll()
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Update failed"
      toast({
        title: "Update failed",
        description: msg,
        variant: "destructive",
      })
    } finally {
      setActing(false)
    }
  }

  const summary = useMemo(() => {
    const active = subs.filter((s) => s.status === "active")
    const activeCount = active.length
    const dueSoon = active.filter((s) => {
      const next = new Date(s.nextChargeAt).getTime()
      return next - Date.now() <= 24 * 3600 * 1000 && next > Date.now()
    }).length
    const mrr = active.reduce((s, x) => s + (x.priceKES ?? 0), 0)
    return { activeCount, dueSoon, mrr }
  }, [subs])

  const filtered = useMemo(() => {
    if (tab === "all") return subs
    return subs.filter((s) => s.status === tab)
  }, [subs, tab])

  return (
    <div className="flex flex-col gap-5">
      {/* Summary */}
      <div className="grid gap-4 sm:grid-cols-3">
        <SummaryCard
          icon={<Repeat className="size-4" />}
          label="Active subscriptions"
          value={summary.activeCount.toString()}
          tone="emerald"
        />
        <SummaryCard
          icon={<Clock className="size-4" />}
          label="Due in 24h"
          value={summary.dueSoon.toString()}
          tone="amber"
        />
        <SummaryCard
          icon={<TrendingUp className="size-4" />}
          label="Monthly recurring"
          value={formatKES(summary.mrr)}
          tone="primary"
        />
      </div>

      {/* Process banner */}
      <Card className="overflow-hidden py-0">
        <div className="bg-gradient-to-r from-primary to-emerald-600 px-5 py-4 text-primary-foreground sm:px-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="grid size-9 place-items-center rounded-lg bg-white/15">
                <Zap className="size-4" />
              </div>
              <div>
                <p className="text-sm font-bold">
                  Process due subscriptions
                </p>
                <p className="text-xs text-primary-foreground/90">
                  Charge all active subscriptions whose next-charge time has
                  passed. Auto-renew their packages.
                </p>
              </div>
            </div>
            <Button
              variant="secondary"
              onClick={processDue}
              disabled={processing}
              className="bg-white/15 text-white hover:bg-white/25 hover:text-white"
            >
              {processing ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Processing…
                </>
              ) : (
                <>
                  <Zap className="size-4" />
                  Process due now
                </>
              )}
            </Button>
          </div>
        </div>
      </Card>

      {/* Subscriptions table */}
      <Card className="py-0">
        <CardHeader className="flex-col gap-3 px-5 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarClock className="size-4 text-primary" />
              Subscriptions
              <span className="text-sm font-normal text-muted-foreground">
                ({filtered.length})
              </span>
            </CardTitle>
            <CardDescription>
              Auto-renewing package subscriptions.
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="icon" onClick={loadAll} aria-label="Refresh">
              <RefreshCw className="size-4" />
            </Button>
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="size-4" />
              <span className="hidden sm:inline">New subscription</span>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="px-2 pb-3 sm:px-4">
          <Tabs
            value={tab}
            onValueChange={(v) => setTab(v as StatusFilter)}
            className="mb-3"
          >
            <TabsList>
              <TabsTrigger value="all">
                All
                <span className="ml-1 font-mono text-xs text-muted-foreground">
                  {subs.length}
                </span>
              </TabsTrigger>
              <TabsTrigger value="active">
                Active
                <span className="ml-1 font-mono text-xs text-muted-foreground">
                  {subs.filter((s) => s.status === "active").length}
                </span>
              </TabsTrigger>
              <TabsTrigger value="paused">
                Paused
                <span className="ml-1 font-mono text-xs text-muted-foreground">
                  {subs.filter((s) => s.status === "paused").length}
                </span>
              </TabsTrigger>
              <TabsTrigger value="cancelled">
                Cancelled
                <span className="ml-1 font-mono text-xs text-muted-foreground">
                  {subs.filter((s) => s.status === "cancelled").length}
                </span>
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {loading ? (
            <div className="flex flex-col gap-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full rounded-md" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed bg-muted/30 px-4 py-12 text-center">
              <CalendarClock className="size-6 text-muted-foreground" />
              <p className="text-sm font-medium">
                No {tab === "all" ? "" : tab} subscriptions
              </p>
              <p className="text-xs text-muted-foreground">
                Create a new subscription to enable auto-renewal.
              </p>
            </div>
          ) : (
            <div className="max-h-[60vh] overflow-auto custom-scroll rounded-lg border">
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-card">
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Package</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden text-right md:table-cell">
                      Next charge
                    </TableHead>
                    <TableHead className="hidden text-right lg:table-cell">
                      Last charged
                    </TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((s, i) => (
                    <motion.tr
                      key={s.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: Math.min(i * 0.02, 0.2) }}
                      className="hover:bg-muted/50"
                    >
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">
                            {s.customerName ?? "—"}
                          </span>
                          <span className="flex items-center gap-1 font-mono text-xs text-muted-foreground">
                            <Smartphone className="size-3" />
                            {s.phone}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">
                        {s.packageName}
                      </TableCell>
                      <TableCell className="text-right font-mono tabular-nums">
                        {formatKES(s.priceKES)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn("capitalize", statusTone(s.status))}
                        >
                          {s.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden text-right text-xs text-muted-foreground md:table-cell">
                        {formatDateTime(s.nextChargeAt)}
                      </TableCell>
                      <TableCell className="hidden text-right text-xs text-muted-foreground lg:table-cell">
                        {s.lastChargedAt ? timeAgo(s.lastChargedAt) : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {s.status === "active" && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() =>
                                setActionTarget({ sub: s, action: "pause" })
                              }
                              aria-label="Pause subscription"
                              title="Pause"
                            >
                              <Pause className="size-3.5" />
                            </Button>
                          )}
                          {s.status === "paused" && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() =>
                                setActionTarget({ sub: s, action: "resume" })
                              }
                              aria-label="Resume subscription"
                              title="Resume"
                            >
                              <Play className="size-3.5" />
                            </Button>
                          )}
                          {s.status !== "cancelled" && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() =>
                                setActionTarget({ sub: s, action: "cancel" })
                              }
                              aria-label="Cancel subscription"
                              title="Cancel"
                            >
                              <XCircle className="size-3.5 text-destructive" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </motion.tr>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create dialog */}
      {createOpen && (
        <CreateDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          phone={createPhone}
          setPhone={setCreatePhone}
          pkg={createPkg}
          setPkg={setCreatePkg}
          packages={packages}
          creating={creating}
          onCreate={create}
        />
      )}

      {/* Action confirm */}
      <AlertDialog
        open={!!actionTarget}
        onOpenChange={(o) => !o && !acting && setActionTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="capitalize">
              {actionTarget?.action} subscription?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {actionTarget?.action === "cancel" && (
                <>
                  This will permanently cancel the auto-renewal for{" "}
                  <span className="font-mono font-semibold">
                    {actionTarget?.sub.phone}
                  </span>
                  . The customer can re-subscribe later.
                </>
              )}
              {actionTarget?.action === "pause" && (
                <>
                  Pausing skips the next charge for{" "}
                  <span className="font-mono font-semibold">
                    {actionTarget?.sub.phone}
                  </span>{" "}
                  until you resume.
                </>
              )}
              {actionTarget?.action === "resume" && (
                <>
                  Resuming re-enables auto-renewal for{" "}
                  <span className="font-mono font-semibold">
                    {actionTarget?.sub.phone}
                  </span>
                  .
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={acting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmAction}
              disabled={acting}
              className={cn(
                actionTarget?.action === "cancel" &&
                  "bg-destructive text-white hover:bg-destructive/90",
                actionTarget?.action === "pause" &&
                  "bg-amber-600 text-white hover:bg-amber-700",
                actionTarget?.action === "resume" &&
                  "bg-primary text-primary-foreground hover:bg-primary/90"
              )}
            >
              {acting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  {actionTarget?.action === "cancel"
                    ? "Cancelling…"
                    : actionTarget?.action === "pause"
                    ? "Pausing…"
                    : "Resuming…"}
                </>
              ) : (
                <>
                  {actionTarget?.action === "cancel" && (
                    <XCircle className="size-4" />
                  )}
                  {actionTarget?.action === "pause" && (
                    <Pause className="size-4" />
                  )}
                  {actionTarget?.action === "resume" && (
                    <Play className="size-4" />
                  )}
                  <span className="capitalize">{actionTarget?.action}</span>
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function CreateDialog({
  open,
  onOpenChange,
  phone,
  setPhone,
  pkg,
  setPkg,
  packages,
  creating,
  onCreate,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  phone: string
  setPhone: (v: string) => void
  pkg: string
  setPkg: (v: string) => void
  packages: WifiPackage[]
  creating: boolean
  onCreate: () => void
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="sm:max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>New subscription</AlertDialogTitle>
          <AlertDialogDescription>
            Enable auto-renewal for a customer. The package will be charged
            automatically when its duration elapses.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="flex flex-col gap-4 py-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="sub-phone">Customer phone *</Label>
            <div className="relative">
              <Smartphone className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="sub-phone"
                inputMode="tel"
                placeholder="07XX XXX XXX"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="sub-pkg">Package *</Label>
            <Select value={pkg} onValueChange={setPkg}>
              <SelectTrigger id="sub-pkg" className="w-full">
                <SelectValue placeholder="Select package" />
              </SelectTrigger>
              <SelectContent>
                {packages.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name} — {formatKES(p.priceKES)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={creating}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault()
              onCreate()
            }}
            disabled={creating}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {creating ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Creating…
              </>
            ) : (
              <>
                <CheckCircle2 className="size-4" />
                Create subscription
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
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
