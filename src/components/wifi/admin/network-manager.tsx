"use client"

import { useEffect, useMemo, useState } from "react"
import { motion } from "framer-motion"
import {
  Activity,
  AlertTriangle,
  Cpu,
  Gauge,
  HardDrive,
  Loader2,
  MapPin,
  Power,
  RefreshCw,
  Router,
  Wifi,
  WifiOff,
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
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
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
import type { RouterHealth } from "@/lib/types"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { formatUptime } from "@/lib/wifi-utils"
import { NetworkBackendPanel } from "@/components/wifi/admin/network-backend-panel"

function statusTone(status: string) {
  switch (status) {
    case "online":
      return {
        className:
          "border-transparent bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
        dot: "bg-emerald-500",
        Icon: Wifi,
      }
    case "warning":
      return {
        className:
          "border-transparent bg-amber-500/15 text-amber-700 dark:text-amber-300",
        dot: "bg-amber-500",
        Icon: AlertTriangle,
      }
    default:
      return {
        className: "border-transparent bg-muted text-muted-foreground",
        dot: "bg-muted-foreground",
        Icon: WifiOff,
      }
  }
}

export function NetworkManager() {
  const { toast } = useToast()
  const [routers, setRouters] = useState<RouterHealth[]>([])
  const [loading, setLoading] = useState(true)
  const [rebootTarget, setRebootTarget] = useState<RouterHealth | null>(null)
  const [rebooting, setRebooting] = useState(false)
  const [rebootingId, setRebootingId] = useState<string | null>(null)
  const [refreshingId, setRefreshingId] = useState<string | null>(null)

  async function load(silent = false) {
    if (!silent) setLoading(true)
    try {
      const res = await fetch("/api/network")
      if (!res.ok) throw new Error("Failed to load network status")
      const data = await res.json()
      setRouters((data.routers ?? []) as RouterHealth[])
    } catch {
      if (!silent) {
        toast({
          title: "Error",
          description: "Could not load router health.",
          variant: "destructive",
        })
      }
    } finally {
      if (!silent) setLoading(false)
    }
  }

  useEffect(() => {
    load()
    const id = setInterval(() => {
      load(true)
    }, 15000)
    return () => clearInterval(id)
  }, [])

  async function refreshOne(router: RouterHealth) {
    setRefreshingId(router.id)
    try {
      const res = await fetch(`/api/network/${router.siteId}`, {
        method: "POST",
      })
      if (!res.ok) throw new Error("Refresh failed")
      const data = await res.json()
      setRouters((prev) =>
        prev.map((r) => (r.id === router.id ? (data.router as RouterHealth) : r))
      )
      toast({
        title: "Status refreshed",
        description: `${router.siteName} health updated.`,
      })
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Refresh failed"
      toast({
        title: "Refresh failed",
        description: msg,
        variant: "destructive",
      })
    } finally {
      setRefreshingId(null)
    }
  }

  async function confirmReboot() {
    if (!rebootTarget) return
    setRebooting(true)
    setRebootingId(rebootTarget.id)
    try {
      const res = await fetch(`/api/network/${rebootTarget.siteId}/reboot`, {
        method: "POST",
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data.error || "Reboot failed")
      }
      setRouters((prev) =>
        prev.map((r) =>
          r.id === rebootTarget.id ? (data.router as RouterHealth) : r
        )
      )
      toast({
        title: "Router rebooting",
        description: data.message || `${rebootTarget.siteName} is rebooting.`,
      })
      setRebootTarget(null)
      // Brief "rebooting" visual state, then refresh.
      setTimeout(() => {
        load(true)
        setRebootingId(null)
      }, 4000)
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Reboot failed"
      toast({
        title: "Reboot failed",
        description: msg,
        variant: "destructive",
      })
      setRebootingId(null)
    } finally {
      setRebooting(false)
    }
  }

  const summary = useMemo(() => {
    const online = routers.filter((r) => r.status === "online").length
    const warning = routers.filter((r) => r.status === "warning").length
    const offline = routers.filter((r) => r.status === "offline").length
    const totalDevices = routers.reduce(
      (s, r) => s + (r.connectedDevices ?? 0),
      0
    )
    const totalBw =
      routers.reduce((s, r) => s + (r.bandwidthInMbps ?? 0), 0) +
      routers.reduce((s, r) => s + (r.bandwidthOutMbps ?? 0), 0)
    return { online, warning, offline, totalDevices, totalBw }
  }, [routers])

  return (
    <div className="flex flex-col gap-5">
      {/* Summary */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          icon={<Wifi className="size-4" />}
          label="Online routers"
          value={`${summary.online}/${routers.length}`}
          tone="emerald"
        />
        <SummaryCard
          icon={<AlertTriangle className="size-4" />}
          label="Warnings"
          value={summary.warning.toString()}
          tone="amber"
        />
        <SummaryCard
          icon={<Activity className="size-4" />}
          label="Connected devices"
          value={summary.totalDevices.toLocaleString("en-KE")}
          tone="primary"
        />
        <SummaryCard
          icon={<Gauge className="size-4" />}
          label="Total bandwidth"
          value={`${summary.totalBw.toFixed(1)} Mbps`}
          tone="emerald"
        />
      </div>

      {/* Network backend configuration + audit log */}
      <NetworkBackendPanel />

      <Card className="py-0">
        <CardHeader className="flex-row items-center justify-between px-5 pt-5">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Router className="size-4 text-primary" />
              Router health
            </CardTitle>
            <CardDescription>
              Auto-refreshes every 15 seconds.
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={() => load()}
            aria-label="Refresh"
          >
            <RefreshCw className="size-4" />
          </Button>
        </CardHeader>
        <CardContent className="px-5 pb-5">
          {loading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-64 rounded-xl" />
              ))}
            </div>
          ) : routers.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed bg-muted/30 px-4 py-12 text-center">
              <Router className="size-6 text-muted-foreground" />
              <p className="text-sm font-medium">No routers reporting</p>
              <p className="text-xs text-muted-foreground">
                Router health will appear here once hotspots come online.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {routers.map((r, i) => (
                <RouterCard
                  key={r.id}
                  router={r}
                  index={i}
                  refreshing={refreshingId === r.id}
                  rebooting={rebootingId === r.id}
                  onRefresh={() => refreshOne(r)}
                  onReboot={() => setRebootTarget(r)}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reboot confirm */}
      <AlertDialog
        open={!!rebootTarget}
        onOpenChange={(o) => !o && !rebooting && setRebootTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reboot router?</AlertDialogTitle>
            <AlertDialogDescription>
              This will reboot the router at{" "}
              <span className="font-semibold">{rebootTarget?.siteName}</span>.
              Connected clients will briefly lose connectivity.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={rebooting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmReboot}
              disabled={rebooting}
              className="bg-amber-600 text-white hover:bg-amber-700"
            >
              {rebooting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Rebooting…
                </>
              ) : (
                <>
                  <Power className="size-4" />
                  Reboot router
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function RouterCard({
  router,
  index,
  refreshing,
  rebooting,
  onRefresh,
  onReboot,
}: {
  router: RouterHealth
  index: number
  refreshing: boolean
  rebooting: boolean
  onRefresh: () => void
  onReboot: () => void
}) {
  const tone = statusTone(router.status)
  const StatusIcon = tone.Icon
  const util =
    router.maxUsers > 0
      ? Math.min(
          100,
          Math.round((router.connectedDevices / router.maxUsers) * 100)
        )
      : 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.04, 0.25) }}
    >
      <Card
        className={cn(
          "h-full py-0 transition-opacity",
          rebooting && "animate-pulse opacity-60",
          router.status === "offline" && "opacity-75"
        )}
      >
        <CardContent className="flex flex-col gap-3 p-5">
          {/* Header */}
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Router className="size-4 shrink-0 text-primary" />
                <h3 className="truncate font-semibold">{router.siteName}</h3>
              </div>
              <p className="mt-1 flex items-center gap-1.5 truncate text-xs text-muted-foreground">
                <MapPin className="size-3" />
                {router.location}
              </p>
            </div>
            <Badge
              variant="outline"
              className={cn("capitalize", tone.className)}
            >
              <StatusIcon className="mr-1 size-3" />
              {rebooting ? "rebooting" : router.status}
            </Badge>
          </div>

          {/* Uptime + devices */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-md border bg-muted/30 px-3 py-2">
              <p className="flex items-center gap-1 text-muted-foreground">
                <Activity className="size-3" />
                Uptime
              </p>
              <p className="font-mono font-medium">
                {formatUptime(router.uptimeSeconds)}
              </p>
            </div>
            <div className="rounded-md border bg-muted/30 px-3 py-2">
              <p className="text-muted-foreground">Devices</p>
              <p className="font-mono font-medium text-primary">
                {router.connectedDevices}
                <span className="text-muted-foreground">
                  {" "}
                  / {router.maxUsers || "∞"}
                </span>
              </p>
            </div>
          </div>

          {/* Device utilisation */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Capacity</span>
              <span className="font-mono tabular-nums">{util}%</span>
            </div>
            <Progress value={util} className="h-1.5" />
          </div>

          {/* Bandwidth */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-md border bg-muted/30 px-3 py-2">
              <p className="flex items-center gap-1 text-muted-foreground">
                <RefreshCw className="size-3" />
                Down
              </p>
              <p className="font-mono font-medium">
                {router.bandwidthInMbps.toFixed(1)} Mbps
              </p>
            </div>
            <div className="rounded-md border bg-muted/30 px-3 py-2">
              <p className="flex items-center gap-1 text-muted-foreground">
                <RefreshCw className="size-3 rotate-180" />
                Up
              </p>
              <p className="font-mono font-medium">
                {router.bandwidthOutMbps.toFixed(1)} Mbps
              </p>
            </div>
          </div>

          {/* CPU + Memory */}
          <div className="flex flex-col gap-2">
            <UsageRow
              icon={<Cpu className="size-3" />}
              label="CPU"
              value={router.cpuUsage}
            />
            <UsageRow
              icon={<HardDrive className="size-3" />}
              label="Memory"
              value={router.memoryUsage}
            />
          </div>

          {/* Actions */}
          <div className="mt-1 flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={onRefresh}
              disabled={refreshing || rebooting}
              className="flex-1"
            >
              {refreshing ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <RefreshCw className="size-3.5" />
              )}
              Refresh
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={onReboot}
              disabled={rebooting}
              className="flex-1 border-amber-500/40 text-amber-700 hover:bg-amber-500/10 dark:text-amber-300"
            >
              {rebooting ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Power className="size-3.5" />
              )}
              Reboot
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

function UsageRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: number
}) {
  const v = Math.max(0, Math.min(100, Math.round(value ?? 0)))
  const tone =
    v >= 85
      ? "text-destructive"
      : v >= 65
      ? "text-amber-600 dark:text-amber-400"
      : "text-primary"
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between text-xs">
        <span className="flex items-center gap-1 text-muted-foreground">
          {icon}
          {label}
        </span>
        <span className={cn("font-mono tabular-nums", tone)}>{v}%</span>
      </div>
      <Progress
        value={v}
        className={cn(
          "h-1.5",
          v >= 85 && "[&>div]:bg-destructive",
          v >= 65 && v < 85 && "[&>div]:bg-amber-500"
        )}
      />
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
