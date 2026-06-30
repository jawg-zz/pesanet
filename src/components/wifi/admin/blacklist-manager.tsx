"use client"

import { useEffect, useMemo, useState } from "react"
import { motion } from "framer-motion"
import {
  Ban,
  Info,
  Loader2,
  Plus,
  RefreshCw,
  ShieldCheck,
  ShieldOff,
  Smartphone,
  Trash2,
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import type { BlacklistEntry } from "@/lib/types"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { timeAgo, validateKePhone } from "@/lib/wifi-utils"

export function BlacklistManager() {
  const { toast } = useToast()
  const [entries, setEntries] = useState<BlacklistEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [phone, setPhone] = useState("")
  const [reason, setReason] = useState("")
  const [adding, setAdding] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<BlacklistEntry | null>(null)
  const [deleting, setDeleting] = useState(false)

  async function load() {
    setLoading(true)
    try {
      const res = await fetch("/api/blacklist")
      if (!res.ok) throw new Error("Failed to load blacklist")
      const data = await res.json()
      setEntries((data.blacklist ?? []) as BlacklistEntry[])
    } catch {
      toast({
        title: "Error",
        description: "Could not load blacklist.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  async function add() {
    if (!validateKePhone(phone)) {
      toast({
        title: "Invalid phone",
        description: "Enter a valid Kenyan number (07XXXXXXXX or 01XXXXXXXX).",
        variant: "destructive",
      })
      return
    }
    if (!reason.trim()) {
      toast({
        title: "Reason required",
        description: "Add a short reason for blocking this number.",
        variant: "destructive",
      })
      return
    }
    setAdding(true)
    try {
      const res = await fetch("/api/blacklist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: phone.trim(),
          reason: reason.trim(),
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data.error || "Could not add to blacklist")
      }
      toast({
        title: "Number blocked",
        description: `${phone.trim()} can no longer purchase or redeem.`,
      })
      setPhone("")
      setReason("")
      await load()
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Block failed"
      toast({
        title: "Block failed",
        description: msg,
        variant: "destructive",
      })
    } finally {
      setAdding(false)
    }
  }

  async function confirmUnblock() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/blacklist/${deleteTarget.id}`, {
        method: "DELETE",
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data.error || "Could not unblock")
      }
      toast({
        title: "Number unblocked",
        description: `${deleteTarget.phone} can purchase again.`,
      })
      setDeleteTarget(null)
      await load()
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unblock failed"
      toast({
        title: "Unblock failed",
        description: msg,
        variant: "destructive",
      })
    } finally {
      setDeleting(false)
    }
  }

  const totalBlocked = entries.length

  return (
    <div className="flex flex-col gap-5">
      {/* Summary + info */}
      <div className="grid gap-4 sm:grid-cols-3">
        <SummaryCard
          icon={<ShieldOff className="size-4" />}
          label="Blocked numbers"
          value={totalBlocked.toString()}
          tone="amber"
        />
        <Card className="col-span-1 border-amber-500/30 bg-amber-500/5 sm:col-span-2">
          <CardContent className="flex items-start gap-3 p-4">
            <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-amber-500/15 text-amber-700 dark:text-amber-300">
              <Info className="size-4" />
            </div>
            <div>
              <p className="text-sm font-semibold">
                How the blacklist works
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Blocked numbers cannot purchase packages or redeem vouchers.
                Add numbers for fraud, abuse, chargebacks, or support issues.
                Unblock at any time to restore access.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {/* Add form */}
        <Card className="py-0">
          <CardHeader className="px-5 pt-5">
            <CardTitle className="flex items-center gap-2 text-base">
              <Ban className="size-4 text-primary" />
              Add to blacklist
            </CardTitle>
            <CardDescription>
              Block a phone number from purchases and redemptions.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 px-5 pb-5">
            <div className="flex flex-col gap-2">
              <Label htmlFor="bl-phone">Phone number *</Label>
              <div className="relative">
                <Smartphone className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="bl-phone"
                  inputMode="tel"
                  placeholder="07XX XXX XXX"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="bl-reason">Reason *</Label>
              <Input
                id="bl-reason"
                placeholder="e.g. Chargeback fraud, abuse…"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>
            <Button onClick={add} disabled={adding} className="w-full">
              {adding ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Blocking…
                </>
              ) : (
                <>
                  <Plus className="size-4" />
                  Block number
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Table */}
        <Card className="py-0 lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between px-5 pt-5">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <ShieldOff className="size-4 text-primary" />
                Blocked numbers
                <span className="text-sm font-normal text-muted-foreground">
                  ({entries.length})
                </span>
              </CardTitle>
              <CardDescription>
                Remove a number to restore access.
              </CardDescription>
            </div>
            <Button variant="outline" size="icon" onClick={load} aria-label="Refresh">
              <RefreshCw className="size-4" />
            </Button>
          </CardHeader>
          <CardContent className="px-2 pb-3 sm:px-4">
            {loading ? (
              <div className="flex flex-col gap-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full rounded-md" />
                ))}
              </div>
            ) : entries.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed bg-muted/30 px-4 py-12 text-center">
                <ShieldCheck className="size-6 text-emerald-600 dark:text-emerald-400" />
                <p className="text-sm font-medium">No blocked numbers</p>
                <p className="text-xs text-muted-foreground">
                  All customers are in good standing.
                </p>
              </div>
            ) : (
              <div className="max-h-[60vh] overflow-auto custom-scroll rounded-lg border">
                <Table>
                  <TableHeader className="sticky top-0 z-10 bg-card">
                    <TableRow>
                      <TableHead>Phone</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead className="hidden text-right sm:table-cell">
                        Blocked
                      </TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {entries.map((e, i) => (
                      <motion.tr
                        key={e.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: Math.min(i * 0.02, 0.2) }}
                        className="hover:bg-muted/50"
                      >
                        <TableCell>
                          <span className="flex items-center gap-2">
                            <span className="grid size-7 place-items-center rounded-md bg-destructive/10 text-destructive">
                              <Ban className="size-3.5" />
                            </span>
                            <span className="font-mono">{e.phone}</span>
                          </span>
                        </TableCell>
                        <TableCell className="max-w-[280px]">
                          <span className="line-clamp-2 text-sm text-muted-foreground">
                            {e.reason}
                          </span>
                        </TableCell>
                        <TableCell className="hidden text-right text-xs text-muted-foreground sm:table-cell">
                          {timeAgo(e.createdAt)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setDeleteTarget(e)}
                            aria-label={`Unblock ${e.phone}`}
                          >
                            <Trash2 className="size-3.5 text-destructive" />
                            <span className="ml-1 hidden sm:inline">
                              Unblock
                            </span>
                          </Button>
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

      {/* Unblock confirm */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && !deleting && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unblock this number?</AlertDialogTitle>
            <AlertDialogDescription>
              <span className="font-mono font-semibold">
                {deleteTarget?.phone}
              </span>{" "}
              will be able to purchase packages and redeem vouchers again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmUnblock}
              disabled={deleting}
              className={cn(
                "bg-primary text-primary-foreground hover:bg-primary/90"
              )}
            >
              {deleting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Unblocking…
                </>
              ) : (
                <>
                  <ShieldCheck className="size-4" />
                  Unblock
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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
