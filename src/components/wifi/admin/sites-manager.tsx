"use client"

import { useEffect, useMemo, useState } from "react"
import { motion } from "framer-motion"
import {
  Activity,
  Loader2,
  MapPin,
  Pencil,
  Plus,
  RadioTower,
  RefreshCw,
  Router,
  Server,
  Trash2,
  Users,
  Wifi,
} from "lucide-react"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
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
import type { HotspotSite } from "@/lib/types"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"

interface FormState {
  name: string
  location: string
  routerIp: string
  maxUsers: number
  status: "active" | "maintenance" | "inactive"
}

const emptyForm: FormState = {
  name: "",
  location: "",
  routerIp: "",
  maxUsers: 50,
  status: "active",
}

function statusTone(status: string): {
  className: string
  dot: string
} {
  switch (status) {
    case "active":
      return {
        className:
          "border-transparent bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
        dot: "bg-emerald-500",
      }
    case "maintenance":
      return {
        className:
          "border-transparent bg-amber-500/15 text-amber-700 dark:text-amber-300",
        dot: "bg-amber-500",
      }
    default:
      return {
        className: "border-transparent bg-muted text-muted-foreground",
        dot: "bg-muted-foreground",
      }
  }
}

export function SitesManager() {
  const { toast } = useToast()
  const [sites, setSites] = useState<HotspotSite[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<HotspotSite | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<HotspotSite | null>(null)
  const [deleting, setDeleting] = useState(false)

  async function load() {
    setLoading(true)
    try {
      const res = await fetch("/api/sites")
      if (!res.ok) throw new Error("Failed to load sites")
      const data = (await res.json()) as { sites: HotspotSite[] }
      setSites(data.sites ?? [])
    } catch {
      toast({
        title: "Error",
        description: "Could not load hotspot sites.",
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

  function openEdit(site: HotspotSite) {
    setEditTarget(site)
    setForm({
      name: site.name,
      location: site.location,
      routerIp: site.routerIp ?? "",
      maxUsers: site.maxUsers,
      status: (site.status as FormState["status"]) || "active",
    })
    setOpen(true)
  }

  async function save() {
    if (!form.name.trim() || !form.location.trim()) {
      toast({
        title: "Missing fields",
        description: "Name and location are required.",
        variant: "destructive",
      })
      return
    }
    setSaving(true)
    try {
      const body = {
        name: form.name.trim(),
        location: form.location.trim(),
        routerIp: form.routerIp.trim() || undefined,
        maxUsers: Number(form.maxUsers) || 0,
        status: form.status,
      }
      const url = editTarget
        ? `/api/sites/${editTarget.id}`
        : "/api/sites"
      const method = editTarget ? "PUT" : "POST"
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data.error || "Could not save site")
      }
      toast({
        title: editTarget ? "Site updated" : "Site created",
        description: `${body.name} — ${body.location}.`,
      })
      setOpen(false)
      load()
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not save site"
      toast({
        title: "Error",
        description: msg,
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/sites/${deleteTarget.id}`, {
        method: "DELETE",
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data.error || "Could not delete site")
      }
      toast({
        title: "Site deleted",
        description: `${deleteTarget.name} was removed.`,
      })
      setDeleteTarget(null)
      load()
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not delete site"
      toast({
        title: "Error",
        description: msg,
        variant: "destructive",
      })
    } finally {
      setDeleting(false)
    }
  }

  const summary = useMemo(() => {
    const active = sites.filter((s) => s.status === "active").length
    const activeSessions = sites.reduce((s, x) => s + (x.activeSessions ?? 0), 0)
    return { total: sites.length, active, activeSessions }
  }, [sites])

  return (
    <div className="flex flex-col gap-5">
      {/* Summary row */}
      <div className="grid gap-4 sm:grid-cols-3">
        <SummaryCard
          icon={<RadioTower className="size-4" />}
          label="Total sites"
          value={summary.total}
          tone="primary"
        />
        <SummaryCard
          icon={<Wifi className="size-4" />}
          label="Active sites"
          value={summary.active}
          tone="emerald"
        />
        <SummaryCard
          icon={<Users className="size-4" />}
          label="Active sessions"
          value={summary.activeSessions}
          tone="amber"
        />
      </div>

      <Card className="py-0">
        <CardHeader className="flex-col gap-3 px-5 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <RadioTower className="size-4 text-primary" />
              Hotspot Sites
              <span className="text-sm font-normal text-muted-foreground">
                ({sites.length})
              </span>
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Manage multi-location routers and capacity.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="icon" onClick={load} aria-label="Refresh">
              <RefreshCw className="size-4" />
            </Button>
            <Button onClick={openCreate}>
              <Plus className="size-4" />
              <span className="hidden sm:inline">Add Site</span>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="px-5 pb-5">
          {loading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-44 rounded-xl" />
              ))}
            </div>
          ) : sites.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed bg-muted/30 px-4 py-12 text-center">
              <RadioTower className="size-6 text-muted-foreground" />
              <p className="text-sm font-medium">No sites yet</p>
              <p className="text-xs text-muted-foreground">
                Add a hotspot site to start tracking routers and capacity.
              </p>
              <Button size="sm" onClick={openCreate} className="mt-2">
                <Plus className="size-4" />
                Add your first site
              </Button>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {sites.map((site, i) => {
                const tone = statusTone(site.status)
                const util =
                  site.maxUsers > 0
                    ? Math.min(
                        100,
                        Math.round((site.activeSessions / site.maxUsers) * 100)
                      )
                    : 0
                return (
                  <motion.div
                    key={site.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(i * 0.04, 0.25) }}
                  >
                    <Card className="h-full py-0">
                      <CardContent className="flex flex-col gap-3 p-5">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <Router className="size-4 shrink-0 text-primary" />
                              <h3 className="truncate font-semibold">
                                {site.name}
                              </h3>
                            </div>
                            <p className="mt-1 flex items-center gap-1.5 truncate text-xs text-muted-foreground">
                              <MapPin className="size-3" />
                              {site.location}
                            </p>
                          </div>
                          <Badge
                            variant="outline"
                            className={cn("capitalize", tone.className)}
                          >
                            <span
                              className={cn(
                                "mr-1 inline-block size-1.5 rounded-full",
                                tone.dot
                              )}
                            />
                            {site.status}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="rounded-md border bg-muted/30 px-3 py-2">
                            <p className="text-muted-foreground">Router IP</p>
                            <p className="truncate font-mono font-medium">
                              {site.routerIp ?? "—"}
                            </p>
                          </div>
                          <div className="rounded-md border bg-muted/30 px-3 py-2">
                            <p className="text-muted-foreground">Max users</p>
                            <p className="font-mono font-medium">
                              {site.maxUsers || "∞"}
                            </p>
                          </div>
                          <div className="rounded-md border bg-muted/30 px-3 py-2">
                            <p className="text-muted-foreground">Active</p>
                            <p className="font-mono font-medium text-primary">
                              {site.activeSessions}
                            </p>
                          </div>
                          <div className="rounded-md border bg-muted/30 px-3 py-2">
                            <p className="text-muted-foreground">Total</p>
                            <p className="font-mono font-medium">
                              {site.totalSessions}
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="flex items-center gap-1 text-muted-foreground">
                              <Activity className="size-3" />
                              Utilisation
                            </span>
                            <span className="font-mono tabular-nums">
                              {util}%
                            </span>
                          </div>
                          <Progress value={util} className="h-1.5" />
                        </div>

                        <div className="mt-1 flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openEdit(site)}
                            className="flex-1"
                          >
                            <Pencil className="size-3.5" />
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setDeleteTarget(site)}
                            aria-label={`Delete ${site.name}`}
                          >
                            <Trash2 className="size-3.5 text-destructive" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create / edit dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RadioTower className="size-4 text-primary" />
              {editTarget ? "Edit site" : "Add hotspot site"}
            </DialogTitle>
            <DialogDescription>
              {editTarget
                ? "Update the site details, capacity and status."
                : "Register a new router location for your WiFi network."}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="site-name">Site name *</Label>
              <Input
                id="site-name"
                placeholder="Nairobi CBD Moi Avenue"
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: e.target.value }))
                }
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="site-loc">Location *</Label>
              <Input
                id="site-loc"
                placeholder="Nairobi, Kenya"
                value={form.location}
                onChange={(e) =>
                  setForm((f) => ({ ...f, location: e.target.value }))
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-2">
                <Label htmlFor="site-ip">Router IP</Label>
                <Input
                  id="site-ip"
                  placeholder="10.0.0.1"
                  value={form.routerIp}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, routerIp: e.target.value }))
                  }
                  className="font-mono"
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="site-max">Max users</Label>
                <Input
                  id="site-max"
                  type="number"
                  min={0}
                  value={form.maxUsers}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      maxUsers: Number(e.target.value),
                    }))
                  }
                />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="site-status">Status</Label>
              <Select
                value={form.status}
                onValueChange={(v) =>
                  setForm((f) => ({
                    ...f,
                    status: v as FormState["status"],
                  }))
                }
              >
                <SelectTrigger id="site-status" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
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
              ) : (
                <>
                  <Server className="size-4" />
                  {editTarget ? "Save changes" : "Create site"}
                </>
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
            <AlertDialogTitle>Delete site?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete{" "}
              <span className="font-semibold">{deleteTarget?.name}</span>.
              Existing sessions will keep their site name, but new sessions can
              no longer be assigned here.
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
  value: number
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
          <p className="text-xl font-bold tabular-nums">{value}</p>
        </div>
      </CardContent>
    </Card>
  )
}
