"use client"

import { useCallback, useEffect, useState } from "react"
import { motion } from "framer-motion"
import { Clock, Power, RefreshCw, Search, Wifi } from "lucide-react"
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { StatusBadge } from "@/components/wifi/status-badge"
import type { WifiSession } from "@/lib/types"
import { formatData, formatKES, timeAgo, timeRemaining } from "@/lib/wifi-utils"
import { useToast } from "@/hooks/use-toast"

type Filter = "active" | "expired" | "disconnected" | "all"

export function SessionsManager() {
  const { toast } = useToast()
  const [filter, setFilter] = useState<Filter>("active")
  const [sessions, setSessions] = useState<WifiSession[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [tick, setTick] = useState(0)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filter !== "all") params.set("status", filter)
      const res = await fetch(`/api/sessions?${params.toString()}`)
      if (!res.ok) throw new Error("Failed to load sessions")
      const data = (await res.json()) as { sessions: WifiSession[] }
      setSessions(data.sessions ?? [])
    } catch {
      toast({
        title: "Error",
        description: "Could not load sessions.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [filter, toast])

  useEffect(() => {
    load()
  }, [load])

  // Auto-refresh active sessions every 10s + tick for countdown.
  useEffect(() => {
    if (filter !== "active") return
    const id = setInterval(load, 10000)
    return () => clearInterval(id)
  }, [filter, load])

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000)
    return () => clearInterval(id)
  }, [])

  async function disconnect(id: string) {
    setActionLoading(id)
    try {
      const res = await fetch(`/api/sessions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "disconnect" }),
      })
      if (!res.ok) throw new Error("Failed to disconnect")
      toast({
        title: "Session disconnected",
        description: "The user has been logged off.",
      })
      setSessions((prev) => prev.filter((s) => s.id !== id))
    } catch {
      toast({
        title: "Error",
        description: "Could not disconnect session.",
        variant: "destructive",
      })
    } finally {
      setActionLoading(null)
    }
  }

  const filtered = sessions.filter((s) => {
    if (!search.trim()) return true
    const q = search.trim().toLowerCase()
    return (
      s.phone.toLowerCase().includes(q) ||
      s.packageName.toLowerCase().includes(q) ||
      (s.mpesaRef ?? "").toLowerCase().includes(q) ||
      (s.customer?.name ?? "").toLowerCase().includes(q)
    )
  })

  return (
    <Card className="py-0">
      <CardHeader className="flex-col gap-3 px-5 pt-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <Wifi className="size-4 text-primary" />
            Sessions
            <span className="text-sm font-normal text-muted-foreground">
              ({filtered.length})
            </span>
          </CardTitle>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search phone, package, ref…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 sm:w-64"
            />
          </div>
          <Button variant="outline" size="icon" onClick={load} aria-label="Refresh">
            <RefreshCw className="size-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="flex flex-col gap-4 px-5 pb-5">
        <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)}>
          <TabsList className="flex w-full flex-wrap justify-start sm:w-auto">
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="expired">Expired</TabsTrigger>
            <TabsTrigger value="disconnected">Disconnected</TabsTrigger>
            <TabsTrigger value="all">All</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="max-h-[60vh] overflow-y-auto custom-scroll rounded-lg border">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-card">
              <TableRow>
                <TableHead>Phone</TableHead>
                <TableHead>Package</TableHead>
                <TableHead className="hidden md:table-cell">Started</TableHead>
                <TableHead>Time left</TableHead>
                <TableHead className="hidden lg:table-cell">Data</TableHead>
                <TableHead className="hidden md:table-cell">Auth</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 8 }).map((__, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-12 text-center">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <Wifi className="size-6" />
                      <p className="text-sm font-medium">No sessions found</p>
                      <p className="text-xs">
                        Try a different filter or search.
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((s, i) => (
                  <motion.tr
                    key={s.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: Math.min(i * 0.02, 0.2) }}
                    className="hover:bg-muted/50 border-b transition-colors"
                  >
                    <TableCell className="font-mono text-xs">{s.phone}</TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{s.packageName}</span>
                        <span className="text-xs text-muted-foreground">
                          {formatKES(s.priceKES)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="hidden text-xs text-muted-foreground md:table-cell">
                      {timeAgo(s.startTime)}
                    </TableCell>
                    <TableCell>
                      {s.status === "active" ? (
                        <span className="flex items-center gap-1 font-mono text-xs font-medium tabular-nums text-primary">
                          <Clock className="size-3" />
                          {timeRemaining(s.endTime)}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="hidden text-xs lg:table-cell">
                      {formatData(s.dataUsedMB)}
                    </TableCell>
                    <TableCell className="hidden text-xs md:table-cell">
                      <div className="flex flex-col">
                        <span className="capitalize">{s.authMethod}</span>
                        {s.mpesaRef && (
                          <span className="font-mono text-[10px] text-muted-foreground">
                            {s.mpesaRef}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={s.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      {s.status === "active" ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => disconnect(s.id)}
                          disabled={actionLoading === s.id}
                        >
                          <Power className="size-3.5" />
                          <span className="hidden sm:inline">Disconnect</span>
                        </Button>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </motion.tr>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
