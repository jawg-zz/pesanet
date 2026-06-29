"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import {
  Clock,
  Globe,
  Loader2,
  MapPin,
  Power,
  Signal,
  Smartphone,
  Sparkles,
  Tag,
  Ticket,
  Wifi,
  Zap,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { StatusBadge } from "@/components/wifi/status-badge"
import type { WifiPackage, WifiSession } from "@/lib/types"
import {
  formatData,
  formatDateTime,
  formatDuration,
  formatKES,
  sessionProgress,
  timeRemaining,
} from "@/lib/wifi-utils"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"

export function ActiveSessionCard({
  session,
  onDisconnected,
  onExpired,
  onExtended,
  onRefresh,
}: {
  session: WifiSession
  onDisconnected?: () => void
  onExpired?: () => void
  onExtended?: (s: WifiSession) => void
  onRefresh?: () => void
}) {
  const { toast } = useToast()
  const [tick, setTick] = useState(0)
  const [disconnecting, setDisconnecting] = useState(false)
  const [extendOpen, setExtendOpen] = useState(false)
  const [packages, setPackages] = useState<WifiPackage[]>([])
  const [packagesLoading, setPackagesLoading] = useState(false)
  const [selectedPkg, setSelectedPkg] = useState<WifiPackage | null>(null)
  const [promoInput, setPromoInput] = useState("")
  const [extending, setExtending] = useState(false)

  // Live countdown — update every second.
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000)
    return () => clearInterval(id)
  }, [])

  // Detect expiry.
  useEffect(() => {
    const end = new Date(session.endTime).getTime()
    if (end <= Date.now()) {
      onExpired?.()
    }
  }, [tick, session.endTime, onExpired])

  const progress = Math.round(sessionProgress(session.startTime, session.endTime) * 100)
  const remaining = timeRemaining(session.endTime)
  const isExpired = remaining === "Expired"

  async function openExtend() {
    setExtendOpen(true)
    if (packages.length === 0) {
      setPackagesLoading(true)
      try {
        const res = await fetch("/api/packages?active=true")
        if (!res.ok) throw new Error("Failed to load")
        const data = (await res.json()) as { packages: WifiPackage[] }
        setPackages(data.packages ?? [])
      } catch {
        toast({
          title: "Error",
          description: "Could not load packages for extension.",
          variant: "destructive",
        })
      } finally {
        setPackagesLoading(false)
      }
    }
  }

  async function confirmExtend() {
    if (!selectedPkg) {
      toast({
        title: "Select a package",
        description: "Pick a package to extend your session.",
        variant: "destructive",
      })
      return
    }
    setExtending(true)
    try {
      const body: Record<string, unknown> = { packageId: selectedPkg.id }
      const code = promoInput.trim().toUpperCase()
      if (code) body.promoCode = code
      const res = await fetch(`/api/sessions/${session.id}/extend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data.error || data.message || "Could not extend session")
      }
      toast({
        title: "Session extended 🎉",
        description: data.message
          ? `${data.message}${data.mpesaRef ? ` · ref ${data.mpesaRef}` : ""}`
          : `Ref ${data.mpesaRef ?? "—"}`,
      })
      setExtendOpen(false)
      setSelectedPkg(null)
      setPromoInput("")
      if (data.session) {
        onExtended?.(data.session as WifiSession)
      } else {
        onRefresh?.()
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not extend session"
      toast({
        title: "Extension failed",
        description: msg,
        variant: "destructive",
      })
    } finally {
      setExtending(false)
    }
  }

  async function handleDisconnect() {
    setDisconnecting(true)
    try {
      const res = await fetch(`/api/sessions/${session.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "disconnect" }),
      })
      if (!res.ok) throw new Error("Failed to disconnect")
      toast({
        title: "Disconnected",
        description: "Your session has been ended.",
      })
      onDisconnected?.()
    } catch {
      toast({
        title: "Error",
        description: "Could not disconnect session.",
        variant: "destructive",
      })
    } finally {
      setDisconnecting(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="overflow-hidden border-primary/40 py-0 shadow-md">
        <div className="bg-gradient-to-r from-primary to-emerald-600 px-5 py-4 text-primary-foreground">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Wifi className="size-5" />
              <span className="text-base font-semibold">
                Active Session
              </span>
              {session.extended && (
                <Badge className="border-transparent bg-white/20 text-white">
                  <Zap className="mr-1 size-3" />
                  Extended
                </Badge>
              )}
            </div>
            <StatusBadge status={isExpired ? "expired" : session.status} className="bg-white/20 text-white" />
          </div>
          {session.siteName && (
            <p className="mt-1 flex items-center gap-1.5 text-xs text-primary-foreground/85">
              <MapPin className="size-3" />
              {session.siteName}
            </p>
          )}
        </div>

        <CardContent className="grid gap-5 p-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-lg font-bold">{session.packageName}</h3>
              <p className="text-sm text-muted-foreground">
                Started {formatDateTime(session.startTime)} ·{" "}
                {formatKES(session.priceKES)}
              </p>
              {session.extended && (
                <p className="mt-0.5 text-xs text-emerald-600 dark:text-emerald-400">
                  Ends {formatDateTime(session.endTime)} (extended)
                </p>
              )}
            </div>
            <div className="flex flex-col items-start gap-1 sm:items-end">
              <span className="text-xs uppercase tracking-wide text-muted-foreground">
                Time remaining
              </span>
              <span className="flex items-center gap-2 font-mono text-xl font-bold tabular-nums text-primary">
                <Clock className="size-4" />
                {remaining}
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Session progress</span>
              <span className="tabular-nums">{progress}%</span>
            </div>
            <Progress value={progress} className="h-2.5" />
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
            <InfoTile
              icon={<Globe className="size-4" />}
              label="Data used"
              value={formatData(session.dataUsedMB)}
            />
            <InfoTile
              icon={<Signal className="size-4" />}
              label="IP address"
              value={session.ipAddress ?? "—"}
              mono
            />
            <InfoTile
              icon={<Smartphone className="size-4" />}
              label="MAC"
              value={session.macAddress ?? "—"}
              mono
            />
            <InfoTile
              icon={<Smartphone className="size-4" />}
              label="Phone"
              value={session.phone}
              mono
            />
            <InfoTile
              icon={
                session.authMethod === "voucher" ? (
                  <Ticket className="size-4" />
                ) : (
                  <Smartphone className="size-4" />
                )
              }
              label="Auth method"
              value={session.authMethod === "voucher" ? "Voucher" : "M-Pesa"}
            />
            <InfoTile
              icon={<Wifi className="size-4" />}
              label="M-Pesa ref"
              value={session.mpesaRef ?? "—"}
              mono
            />
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              onClick={handleDisconnect}
              disabled={disconnecting || isExpired}
              variant="destructive"
              className="flex-1 sm:flex-none"
            >
              <Power className="size-4" />
              {disconnecting ? "Disconnecting…" : "Disconnect"}
            </Button>
            <Button
              onClick={openExtend}
              disabled={isExpired}
              variant="outline"
              className="flex-1 border-primary/40 text-primary hover:bg-primary/10 sm:flex-none"
            >
              <Zap className="size-4" />
              Extend Session
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Extend dialog */}
      <Dialog open={extendOpen} onOpenChange={setExtendOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="size-4 text-primary" />
              Extend your session
            </DialogTitle>
            <DialogDescription>
              Top up by adding another package. You'll be charged via M-Pesa.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="rounded-md border bg-muted/40 p-3 text-xs">
              <p className="flex items-center justify-between">
                <span className="text-muted-foreground">Current ends</span>
                <span className="font-mono font-medium">
                  {formatDateTime(session.endTime)}
                </span>
              </p>
              <p className="mt-1 flex items-center justify-between">
                <span className="text-muted-foreground">Time left</span>
                <span className="font-mono font-medium text-primary">
                  {remaining}
                </span>
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <Label>Select a package</Label>
              {packagesLoading ? (
                <div className="flex items-center justify-center gap-2 rounded-md border bg-muted/30 py-6 text-xs text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" />
                  Loading packages…
                </div>
              ) : packages.length === 0 ? (
                <div className="rounded-md border border-dashed bg-muted/30 px-3 py-4 text-center text-xs text-muted-foreground">
                  No active packages available right now.
                </div>
              ) : (
                <div className="max-h-52 overflow-y-auto custom-scroll flex flex-col gap-2 pr-1">
                  {packages.map((p) => {
                    const active = selectedPkg?.id === p.id
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setSelectedPkg(p)}
                        className={cn(
                          "flex items-center justify-between gap-3 rounded-lg border p-3 text-left transition",
                          active
                            ? "border-primary bg-primary/5 ring-1 ring-primary/40"
                            : "hover:border-primary/40 hover:bg-muted/40"
                        )}
                      >
                        <div className="min-w-0">
                          <p className="flex items-center gap-1.5 truncate text-sm font-medium">
                            {p.name}
                            {p.popular && (
                              <Badge className="border-transparent bg-emerald-500/15 px-1.5 py-0 text-[10px] text-emerald-700 dark:text-emerald-300">
                                Popular
                              </Badge>
                            )}
                          </p>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {formatDuration(p.durationMinutes)} ·{" "}
                            {p.dataLimitMB <= 0
                              ? "Unlimited"
                              : `${p.dataLimitMB} MB`}
                          </p>
                        </div>
                        <span className="shrink-0 font-semibold tabular-nums text-primary">
                          {formatKES(p.priceKES)}
                        </span>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="ext-promo" className="flex items-center gap-1.5">
                <Tag className="size-3.5 text-primary" />
                Promo code <span className="text-muted-foreground">(optional)</span>
              </Label>
              <Input
                id="ext-promo"
                placeholder="WELCOME10"
                value={promoInput}
                onChange={(e) =>
                  setPromoInput(e.target.value.toUpperCase())
                }
                className="font-mono tracking-wide"
              />
            </div>

            {selectedPkg && (
              <div className="rounded-md border bg-muted/40 p-3 text-xs">
                <p className="flex items-center justify-between">
                  <span className="text-muted-foreground">New end time</span>
                  <span className="font-mono font-medium">
                    {formatDateTime(
                      new Date(
                        Math.max(
                          Date.now(),
                          new Date(session.endTime).getTime()
                        ) +
                          selectedPkg.durationMinutes * 60 * 1000
                      )
                    )}
                  </span>
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExtendOpen(false)}>
              Cancel
            </Button>
            <Button onClick={confirmExtend} disabled={extending || !selectedPkg}>
              {extending ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Extending…
                </>
              ) : (
                <>
                  <Sparkles className="size-4" />
                  Extend session
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}

function InfoTile({
  icon,
  label,
  value,
  mono,
}: {
  icon: React.ReactNode
  label: string
  value: string
  mono?: boolean
}) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border bg-muted/30 p-3">
      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {icon}
        {label}
      </span>
      <span
        className={`truncate text-sm font-medium ${
          mono ? "font-mono" : ""
        }`}
      >
        {value}
      </span>
    </div>
  )
}
