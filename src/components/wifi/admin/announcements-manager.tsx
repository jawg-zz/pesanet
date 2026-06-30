"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import {
  AlertTriangle,
  CalendarClock,
  Info,
  Loader2,
  Megaphone,
  Pencil,
  Plus,
  RefreshCw,
  Tag,
  Trash2,
  Wrench,
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
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Skeleton } from "@/components/ui/skeleton"
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
import type { Announcement } from "@/lib/types"
import { cn } from "@/lib/utils"
import { formatDateTime, timeAgo } from "@/lib/wifi-utils"
import { useToast } from "@/hooks/use-toast"

type AnnouncementType = "info" | "warning" | "maintenance" | "promo"

interface FormState {
  title: string
  message: string
  type: AnnouncementType
  active: boolean
  expiresAt: string
}

const emptyForm: FormState = {
  title: "",
  message: "",
  type: "info",
  active: true,
  expiresAt: "",
}

function typeMeta(type: string) {
  switch (type) {
    case "warning":
      return {
        label: "Warning",
        icon: AlertTriangle,
        badge:
          "border-transparent bg-amber-500/15 text-amber-700 dark:text-amber-300",
      }
    case "maintenance":
      return {
        label: "Maintenance",
        icon: Wrench,
        badge:
          "border-transparent bg-orange-500/15 text-orange-700 dark:text-orange-300",
      }
    case "promo":
      return {
        label: "Promo",
        icon: Tag,
        badge:
          "border-transparent bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
      }
    default:
      return {
        label: "Info",
        icon: Info,
        badge: "border-transparent bg-slate-500/15 text-slate-700 dark:text-slate-300",
      }
  }
}

export function AnnouncementsManager() {
  const { toast } = useToast()
  const [items, setItems] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Announcement | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Announcement | null>(null)
  const [deleting, setDeleting] = useState(false)

  async function load() {
    setLoading(true)
    try {
      const res = await fetch("/api/announcements?all=true")
      if (!res.ok) throw new Error("Failed to load")
      const data = (await res.json()) as { announcements: Announcement[] }
      setItems(data.announcements ?? [])
    } catch {
      toast({
        title: "Error",
        description: "Could not load announcements.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  function openCreate() {
    setEditTarget(null)
    setForm(emptyForm)
    setOpen(true)
  }

  function openEdit(a: Announcement) {
    setEditTarget(a)
    setForm({
      title: a.title,
      message: a.message,
      type: (a.type as AnnouncementType) || "info",
      active: a.active,
      expiresAt: a.expiresAt
        ? new Date(a.expiresAt).toISOString().slice(0, 10)
        : "",
    })
    setOpen(true)
  }

  async function save() {
    if (!form.title.trim() || !form.message.trim()) {
      toast({
        title: "Missing fields",
        description: "Title and message are required.",
        variant: "destructive",
      })
      return
    }
    setSaving(true)
    try {
      const body = {
        title: form.title.trim(),
        message: form.message.trim(),
        type: form.type,
        active: form.active,
        expiresAt: form.expiresAt
          ? new Date(form.expiresAt).toISOString()
          : undefined,
      }
      const url = editTarget
        ? `/api/announcements/${editTarget.id}`
        : "/api/announcements"
      const method = editTarget ? "PUT" : "POST"
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || "Could not save announcement")
      toast({
        title: editTarget ? "Announcement updated" : "Announcement created",
        description: body.title,
      })
      setOpen(false)
      load()
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not save"
      toast({
        title: "Error",
        description: msg,
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  async function toggleActive(a: Announcement) {
    // Optimistic update.
    setItems((cur) =>
      cur.map((x) => (x.id === a.id ? { ...x, active: !x.active } : x))
    )
    try {
      const res = await fetch(`/api/announcements/${a.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !a.active }),
      })
      if (!res.ok) throw new Error("Failed to toggle")
      toast({
        title: a.active ? "Announcement hidden" : "Announcement published",
        description: a.title,
      })
    } catch {
      // Revert on failure.
      setItems((cur) =>
        cur.map((x) => (x.id === a.id ? { ...x, active: a.active } : x))
      )
      toast({
        title: "Error",
        description: "Could not update announcement.",
        variant: "destructive",
      })
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/announcements/${deleteTarget.id}`, {
        method: "DELETE",
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || "Could not delete")
      toast({
        title: "Announcement deleted",
        description: deleteTarget.title,
      })
      setDeleteTarget(null)
      load()
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not delete"
      toast({
        title: "Error",
        description: msg,
        variant: "destructive",
      })
    } finally {
      setDeleting(false)
    }
  }

  const activeCount = items.filter((a) => a.active).length

  return (
    <Card className="py-0">
      <CardHeader className="flex-col gap-3 px-5 pt-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <Megaphone className="size-4 text-primary" />
            Announcements
            <span className="text-sm font-normal text-muted-foreground">
              ({items.length})
            </span>
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            {activeCount} active · {items.length - activeCount} hidden
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="icon" onClick={load} aria-label="Refresh">
            <RefreshCw className="size-4" />
          </Button>
          <Button onClick={openCreate}>
            <Plus className="size-4" />
            <span className="hidden sm:inline">Create Announcement</span>
          </Button>
        </div>
      </CardHeader>

      <CardContent className="px-5 pb-5">
        <div className="max-h-[60vh] overflow-y-auto custom-scroll rounded-lg border">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-card">
              <TableRow>
                <TableHead className="min-w-[180px]">Title</TableHead>
                <TableHead className="hidden md:table-cell">Message</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="hidden sm:table-cell">Expires</TableHead>
                <TableHead className="hidden lg:table-cell">Created</TableHead>
                <TableHead>Active</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 7 }).map((__, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-12 text-center">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <Megaphone className="size-6" />
                      <p className="text-sm font-medium">No announcements yet</p>
                      <p className="text-xs">
                        Broadcast maintenance windows, promos, or notices to
                        customers.
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                items.map((a, i) => {
                  const meta = typeMeta(a.type)
                  const TypeIcon = meta.icon
                  return (
                    <motion.tr
                      key={a.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: Math.min(i * 0.03, 0.2) }}
                      className="border-b transition-colors hover:bg-muted/50"
                    >
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              "grid size-7 shrink-0 place-items-center rounded-md",
                              meta.badge
                            )}
                          >
                            <TypeIcon className="size-3.5" />
                          </span>
                          <span className="line-clamp-1 font-medium">
                            {a.title}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="hidden max-w-xs text-xs text-muted-foreground md:table-cell">
                        <span className="line-clamp-2">{a.message}</span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={meta.badge}>
                          {meta.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden text-xs text-muted-foreground sm:table-cell">
                        {a.expiresAt ? (
                          <span className="flex items-center gap-1">
                            <CalendarClock className="size-3" />
                            {formatDateTime(a.expiresAt)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground/70">
                            No expiry
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="hidden text-xs text-muted-foreground lg:table-cell">
                        {timeAgo(a.createdAt)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={a.active}
                            onCheckedChange={() => toggleActive(a)}
                            aria-label="Toggle active"
                          />
                          <span className="text-xs">
                            {a.active ? "Live" : "Hidden"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openEdit(a)}
                            aria-label={`Edit ${a.title}`}
                          >
                            <Pencil className="size-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setDeleteTarget(a)}
                            aria-label={`Delete ${a.title}`}
                          >
                            <Trash2 className="size-3.5 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </motion.tr>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      {/* Create / edit dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Megaphone className="size-4 text-primary" />
              {editTarget ? "Edit announcement" : "Create announcement"}
            </DialogTitle>
            <DialogDescription>
              Active announcements appear as a banner at the top of the customer
              portal.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="ann-title">Title *</Label>
              <Input
                id="ann-title"
                placeholder="Scheduled maintenance"
                value={form.title}
                onChange={(e) =>
                  setForm((f) => ({ ...f, title: e.target.value }))
                }
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="ann-msg">Message *</Label>
              <Textarea
                id="ann-msg"
                rows={3}
                placeholder="Our network will be offline on Saturday from 2am to 4am for upgrades."
                value={form.message}
                onChange={(e) =>
                  setForm((f) => ({ ...f, message: e.target.value }))
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-2">
                <Label htmlFor="ann-type">Type</Label>
                <Select
                  value={form.type}
                  onValueChange={(v) =>
                    setForm((f) => ({
                      ...f,
                      type: v as AnnouncementType,
                    }))
                  }
                >
                  <SelectTrigger id="ann-type" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="info">Info</SelectItem>
                    <SelectItem value="warning">Warning</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                    <SelectItem value="promo">Promo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="ann-exp">Expires at (optional)</Label>
                <Input
                  id="ann-exp"
                  type="date"
                  value={form.expiresAt}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, expiresAt: e.target.value }))
                  }
                />
              </div>
            </div>
            <div className="flex items-center justify-between rounded-md border bg-muted/40 px-3 py-2.5">
              <div>
                <p className="text-sm font-medium">Publish immediately</p>
                <p className="text-xs text-muted-foreground">
                  Toggle off to save as draft.
                </p>
              </div>
              <Switch
                checked={form.active}
                onCheckedChange={(v) => setForm((f) => ({ ...f, active: v }))}
                aria-label="Active"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={save} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Saving…
                </>
              ) : editTarget ? (
                "Save changes"
              ) : (
                "Create announcement"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete announcement?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete{" "}
              <span className="font-semibold">{deleteTarget?.title}</span>.
            </AlertDialogDescription>
          </AlertDialogHeader>
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
