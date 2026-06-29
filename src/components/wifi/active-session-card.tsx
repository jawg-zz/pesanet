"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import {
  Clock,
  Globe,
  Power,
  Signal,
  Smartphone,
  Ticket,
  Wifi,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { StatusBadge } from "@/components/wifi/status-badge"
import type { WifiSession } from "@/lib/types"
import {
  formatData,
  formatDateTime,
  formatKES,
  sessionProgress,
  timeRemaining,
} from "@/lib/wifi-utils"
import { useToast } from "@/hooks/use-toast"

export function ActiveSessionCard({
  session,
  onDisconnected,
  onExpired,
}: {
  session: WifiSession
  onDisconnected?: () => void
  onExpired?: () => void
}) {
  const { toast } = useToast()
  const [tick, setTick] = useState(0)
  const [disconnecting, setDisconnecting] = useState(false)

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
            </div>
            <StatusBadge status={isExpired ? "expired" : session.status} className="bg-white/20 text-white" />
          </div>
        </div>

        <CardContent className="grid gap-5 p-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-lg font-bold">{session.packageName}</h3>
              <p className="text-sm text-muted-foreground">
                Started {formatDateTime(session.startTime)} ·{" "}
                {formatKES(session.priceKES)}
              </p>
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

          <Button
            onClick={handleDisconnect}
            disabled={disconnecting || isExpired}
            variant="destructive"
            className="w-full sm:w-auto"
          >
            <Power className="size-4" />
            {disconnecting ? "Disconnecting…" : "Disconnect"}
          </Button>
        </CardContent>
      </Card>
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
