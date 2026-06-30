"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import {
  ChevronRight,
  Inbox,
  LifeBuoy,
  Loader2,
  Mail,
  RefreshCw,
  Search,
  Send,
  Smartphone,
  Trash2,
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
import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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
import {
  CategoryBadge,
  PriorityBadge,
  TicketStatusBadge,
} from "@/components/wifi/feature-badges"
import type { SupportTicket } from "@/lib/types"
import { formatDateTime, timeAgo } from "@/lib/wifi-utils"
import { useToast } from "@/hooks/use-toast"

type Filter = "open" | "in_progress" | "resolved" | "closed" | "all"

const FILTERS: { id: Filter; label: string }[] = [
  { id: "open", label: "Open" },
  { id: "in_progress", label: "In Progress" },
  { id: "resolved", label: "Resolved" },
  { id: "closed", label: "Closed" },
  { id: "all", label: "All" },
]

export function TicketsManager() {
  const { toast } = useToast()
  const [tickets, setTickets] = useState<SupportTicket[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<Filter>("open")
  const [search, setSearch] = useState("")
  const [active, setActive] = useState<SupportTicket | null>(null)
  const [reply, setReply] = useState("")
  const [newStatus, setNewStatus] = useState<string>("in_progress")
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<SupportTicket | null>(null)
  const [deleting, setDeleting] = useState(false)

  async function load() {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filter !== "all") params.set("status", filter)
      const res = await fetch(`/api/tickets?${params.toString()}`)
      if (!res.ok) throw new Error("Failed to load")
      const data = (await res.json()) as { tickets: SupportTicket[] }
      setTickets(data.tickets ?? [])
    } catch {
      toast({
        title: "Error",
        description: "Could not load tickets.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [filter])

  function openTicket(t: SupportTicket) {
    setActive(t)
    setReply(t.adminReply ?? "")
    // Suggest next status based on current
    setNewStatus(t.status === "open" ? "in_progress" : t.status)
  }

  async function saveReply() {
    if (!active) return
    setSaving(true)
    try {
      const res = await fetch(`/api/tickets/${active.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: newStatus,
          adminReply: reply.trim() || null,
        }),
      })
      if (!res.ok) throw new Error("Failed to save reply")
      toast({
        title: "Reply saved",
        description: `Ticket status: ${newStatus.replace("_", " ")}.`,
      })
      const updated = (await res.json()) as { ticket: SupportTicket }
      if (updated.ticket) {
        setActive(updated.ticket)
      } else {
        setActive(null)
      }
      load()
    } catch {
      toast({
        title: "Error",
        description: "Could not save reply.",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  async function quickUpdate(t: SupportTicket, status: string) {
    try {
      const res = await fetch(`/api/tickets/${t.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      })
      if (!res.ok) throw new Error("Failed to update")
      toast({
        title: "Ticket updated",
        description: `Status set to ${status.replace("_", " ")}.`,
      })
      if (active?.id === t.id) setActive(null)
      load()
    } catch {
      toast({
        title: "Error",
        description: "Could not update ticket.",
        variant: "destructive",
      })
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/tickets/${deleteTarget.id}`, {
        method: "DELETE",
      })
      if (!res.ok) throw new Error("Failed to delete")
      toast({
        title: "Ticket deleted",
        description: `Removed "${deleteTarget.subject}".`,
      })
      if (active?.id === deleteTarget.id) setActive(null)
      setDeleteTarget(null)
      load()
    } catch {
      toast({
        title: "Error",
        description: "Could not delete ticket.",
        variant: "destructive",
      })
    } finally {
      setDeleting(false)
    }
  }

  const filtered = tickets.filter((t) => {
    if (!search.trim()) return true
    const q = search.trim().toLowerCase()
    return (
      t.subject.toLowerCase().includes(q) ||
      t.message.toLowerCase().includes(q) ||
      t.phone.toLowerCase().includes(q) ||
      (t.customerName ?? "").toLowerCase().includes(q)
    )
  })

  const counts = tickets.reduce(
    (acc, t) => {
      acc[t.status] = (acc[t.status] ?? 0) + 1
      return acc
    },
    {} as Record<string, number>
  )

  return (
    <Card className="py-0">
      <CardHeader className="flex-col gap-3 px-5 pt-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <LifeBuoy className="size-4 text-primary" />
            Support Tickets
            <span className="text-sm font-normal text-muted-foreground">
              ({filtered.length})
            </span>
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            {counts.open ?? 0} open · {counts.in_progress ?? 0} in progress ·{" "}
            {counts.resolved ?? 0} resolved
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search subject, phone…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 sm:w-56"
            />
          </div>
          <Button variant="outline" size="icon" onClick={load} aria-label="Refresh">
            <RefreshCw className="size-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="flex flex-col gap-4 px-5 pb-5">
        <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)}>
          <TabsList className="flex-wrap">
            {FILTERS.map((f) => (
              <TabsTrigger key={f.id} value={f.id} className="text-xs">
                {f.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <div className="max-h-[60vh] overflow-y-auto custom-scroll rounded-lg border">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-card">
              <TableRow>
                <TableHead>Subject</TableHead>
                <TableHead className="hidden md:table-cell">Phone</TableHead>
                <TableHead className="hidden lg:table-cell">Category</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden sm:table-cell">Opened</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 7 }).map((__, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-12 text-center">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <Inbox className="size-6" />
                      <p className="text-sm font-medium">No tickets here</p>
                      <p className="text-xs">
                        {filter === "all"
                          ? "No support tickets yet."
                          : `No ${filter.replace("_", " ")} tickets.`}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((t, i) => (
                  <motion.tr
                    key={t.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: Math.min(i * 0.02, 0.2) }}
                    className="hover:bg-muted/50 border-b transition-colors cursor-pointer"
                    onClick={() => openTicket(t)}
                  >
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{t.subject}</span>
                        <span className="line-clamp-1 text-xs text-muted-foreground">
                          {t.message}
                        </span>
                        {t.adminReply && (
                          <span className="mt-0.5 flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400">
                            <Mail className="size-3" /> Replied
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <div className="flex flex-col">
                        <span className="font-mono text-xs">{t.phone}</span>
                        {t.customerName && (
                          <span className="text-xs text-muted-foreground">
                            {t.customerName}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <CategoryBadge category={t.category} />
                    </TableCell>
                    <TableCell>
                      <PriorityBadge priority={t.priority} />
                    </TableCell>
                    <TableCell>
                      <TicketStatusBadge status={t.status} />
                    </TableCell>
                    <TableCell className="hidden text-xs text-muted-foreground sm:table-cell">
                      {timeAgo(t.createdAt)}
                    </TableCell>
                    <TableCell
                      className="text-right"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-end gap-1">
                        <Select
                          value={t.status}
                          onValueChange={(v) => quickUpdate(t, v)}
                        >
                          <SelectTrigger size="sm" className="h-8 w-28 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="open">Open</SelectItem>
                            <SelectItem value="in_progress">In Progress</SelectItem>
                            <SelectItem value="resolved">Resolved</SelectItem>
                            <SelectItem value="closed">Closed</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setDeleteTarget(t)}
                          aria-label={`Delete ${t.subject}`}
                        >
                          <Trash2 className="size-4 text-destructive" />
                        </Button>
                        <ChevronRight className="size-4 text-muted-foreground" />
                      </div>
                    </TableCell>
                  </motion.tr>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      {/* Ticket detail / reply dialog */}
      <Dialog open={!!active} onOpenChange={(o) => !o && setActive(null)}>
        <DialogContent className="sm:max-w-lg">
          {active && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-start gap-2">
                  <LifeBuoy className="size-5 shrink-0 text-primary" />
                  <span className="min-w-0 break-words">{active.subject}</span>
                </DialogTitle>
                <DialogDescription>
                  Opened {formatDateTime(active.createdAt)} · #{active.id.slice(-6)}
                </DialogDescription>
              </DialogHeader>

              <div className="flex flex-col gap-3">
                {/* Badges */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <CategoryBadge category={active.category} />
                  <PriorityBadge priority={active.priority} />
                  <TicketStatusBadge status={active.status} />
                </div>

                {/* Customer */}
                <div className="grid grid-cols-2 gap-2 rounded-lg border bg-muted/30 p-3 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">From</p>
                    <p className="font-medium">
                      {active.customerName ?? "Unknown"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Phone</p>
                    <p className="flex items-center gap-1 font-mono text-xs">
                      <Smartphone className="size-3" />
                      {active.phone}
                    </p>
                  </div>
                </div>

                {/* Message */}
                <div>
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Customer message
                  </p>
                  <div className="rounded-lg border bg-background p-3 text-sm">
                    {active.message}
                  </div>
                </div>

                {/* Existing reply */}
                {active.adminReply && (
                  <div>
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
                      Previous reply
                    </p>
                    <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3 text-sm">
                      {active.adminReply}
                    </div>
                  </div>
                )}

                <Separator />

                {/* Reply form */}
                <div className="flex flex-col gap-2">
                  <Label htmlFor="ticket-reply">Reply / update notes</Label>
                  <Textarea
                    id="ticket-reply"
                    placeholder="Type your reply to the customer…"
                    rows={4}
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="ticket-status">Set status</Label>
                  <Select value={newStatus} onValueChange={setNewStatus}>
                    <SelectTrigger id="ticket-status" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open">Open</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setActive(null)}>
                  Close
                </Button>
                <Button onClick={saveReply} disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Saving…
                    </>
                  ) : (
                    <>
                      <Send className="size-4" />
                      Save reply
                    </>
                  )}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete ticket?</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogDescription>
            Permanently delete the ticket{" "}
            <strong>{deleteTarget?.subject}</strong>? This cannot be undone.
          </AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={deleting}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {deleting ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}
