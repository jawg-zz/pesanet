"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import {
  Check,
  Clock,
  Gauge,
  Pencil,
  Plus,
  Star,
  Trash2,
  Upload,
  Zap,
} from "lucide-react"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
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
import type { WifiPackage } from "@/lib/types"
import {
  formatData,
  formatDuration,
  formatKES,
} from "@/lib/wifi-utils"
import { useToast } from "@/hooks/use-toast"

interface FormState {
  name: string
  priceKES: number
  durationMinutes: number
  dataLimitMB: number
  downloadSpeedMbps: number
  uploadSpeedMbps: number
  description: string
  popular: boolean
  active: boolean
}

const emptyForm: FormState = {
  name: "",
  priceKES: 0,
  durationMinutes: 60,
  dataLimitMB: 0,
  downloadSpeedMbps: 10,
  uploadSpeedMbps: 5,
  description: "",
  popular: false,
  active: true,
}

export function PackagesManager() {
  const { toast } = useToast()
  const [packages, setPackages] = useState<WifiPackage[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<WifiPackage | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [deleteId, setDeleteId] = useState<WifiPackage | null>(null)
  const [deleting, setDeleting] = useState(false)

  async function load() {
    setLoading(true)
    try {
      const res = await fetch("/api/packages")
      if (!res.ok) throw new Error("Failed to load")
      const data = (await res.json()) as { packages: WifiPackage[] }
      setPackages(data.packages ?? [])
    } catch {
      toast({
        title: "Error",
        description: "Could not load packages.",
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
    setEditing(null)
    setForm(emptyForm)
    setOpen(true)
  }

  function openEdit(pkg: WifiPackage) {
    setEditing(pkg)
    setForm({
      name: pkg.name,
      priceKES: pkg.priceKES,
      durationMinutes: pkg.durationMinutes,
      dataLimitMB: pkg.dataLimitMB,
      downloadSpeedMbps: pkg.downloadSpeedMbps,
      uploadSpeedMbps: pkg.uploadSpeedMbps,
      description: pkg.description,
      popular: pkg.popular,
      active: pkg.active,
    })
    setOpen(true)
  }

  async function save() {
    if (!form.name.trim()) {
      toast({
        title: "Name required",
        description: "Please enter a package name.",
        variant: "destructive",
      })
      return
    }
    setSaving(true)
    try {
      const body = { ...form, priceKES: Number(form.priceKES), durationMinutes: Number(form.durationMinutes), dataLimitMB: Number(form.dataLimitMB), downloadSpeedMbps: Number(form.downloadSpeedMbps), uploadSpeedMbps: Number(form.uploadSpeedMbps) }
      const res = editing
        ? await fetch(`/api/packages/${editing.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          })
        : await fetch("/api/packages", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          })
      if (!res.ok) throw new Error("Failed to save package")
      toast({
        title: editing ? "Package updated" : "Package created",
        description: `${form.name} saved successfully.`,
      })
      setOpen(false)
      load()
    } catch {
      toast({
        title: "Error",
        description: "Could not save package.",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  async function confirmDelete() {
    if (!deleteId) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/packages/${deleteId.id}`, {
        method: "DELETE",
      })
      if (!res.ok) throw new Error("Failed to delete")
      toast({
        title: "Package deleted",
        description: `${deleteId.name} was removed.`,
      })
      setDeleteId(null)
      load()
    } catch {
      toast({
        title: "Error",
        description: "Could not delete package.",
        variant: "destructive",
      })
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Card className="py-0">
      <CardHeader className="flex-row items-center justify-between px-5 pt-5">
        <div>
          <CardTitle className="text-base">Packages</CardTitle>
          <p className="text-xs text-muted-foreground">
            Manage WiFi packages customers can buy.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="size-4" />
          <span className="hidden sm:inline">Add Package</span>
        </Button>
      </CardHeader>
      <CardContent className="px-5 pb-5">
        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-40 rounded-xl" />
            ))}
          </div>
        ) : packages.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed bg-muted/30 px-4 py-12 text-center">
            <p className="text-sm font-medium">No packages yet</p>
            <p className="text-xs text-muted-foreground">
              Create your first package to start selling WiFi.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {packages.map((p, i) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.04, 0.3) }}
                className={`relative flex flex-col gap-3 rounded-xl border p-4 ${
                  p.popular ? "border-primary/50 ring-1 ring-primary/30" : ""
                } ${!p.active ? "opacity-60" : ""}`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold">{p.name}</h3>
                    <p className="text-lg font-extrabold text-primary">
                      {formatKES(p.priceKES)}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {p.popular && (
                      <Badge className="bg-primary text-primary-foreground">
                        <Star className="size-3 fill-current" /> Popular
                      </Badge>
                    )}
                    <Badge variant={p.active ? "outline" : "secondary"}>
                      {p.active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <Clock className="size-3.5" />
                    {formatDuration(p.durationMinutes)}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Gauge className="size-3.5" />
                    {formatData(p.dataLimitMB)}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Zap className="size-3.5" />
                    {p.downloadSpeedMbps} Mbps
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Upload className="size-3.5" />
                    {p.uploadSpeedMbps} Mbps
                  </span>
                </div>

                {p.description && (
                  <p className="line-clamp-2 text-xs text-muted-foreground">
                    {p.description}
                  </p>
                )}

                <div className="mt-auto flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() => openEdit(p)}
                  >
                    <Pencil className="size-3.5" />
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setDeleteId(p)}
                    aria-label={`Delete ${p.name}`}
                  >
                    <Trash2 className="size-3.5 text-destructive" />
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Create / edit dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Edit package" : "New package"}
            </DialogTitle>
            <DialogDescription>
              {editing
                ? "Update the package details below."
                : "Configure a new WiFi package for customers to buy."}
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[60vh] overflow-y-auto custom-scroll pr-1">
            <div className="grid gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="pkg-name">Name</Label>
                <Input
                  id="pkg-name"
                  value={form.name}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, name: e.target.value }))
                  }
                  placeholder="e.g. Daily 1GB"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <NumField
                  id="pkg-price"
                  label="Price (KES)"
                  value={form.priceKES}
                  onChange={(v) => setForm((f) => ({ ...f, priceKES: v }))}
                />
                <NumField
                  id="pkg-duration"
                  label="Duration (min)"
                  value={form.durationMinutes}
                  onChange={(v) => setForm((f) => ({ ...f, durationMinutes: v }))}
                />
                <NumField
                  id="pkg-data"
                  label="Data (MB, 0=∞)"
                  value={form.dataLimitMB}
                  onChange={(v) => setForm((f) => ({ ...f, dataLimitMB: v }))}
                />
                <NumField
                  id="pkg-down"
                  label="Download (Mbps)"
                  value={form.downloadSpeedMbps}
                  onChange={(v) =>
                    setForm((f) => ({ ...f, downloadSpeedMbps: v }))
                  }
                />
                <NumField
                  id="pkg-up"
                  label="Upload (Mbps)"
                  value={form.uploadSpeedMbps}
                  onChange={(v) =>
                    setForm((f) => ({ ...f, uploadSpeedMbps: v }))
                  }
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="pkg-desc">Description</Label>
                <Textarea
                  id="pkg-desc"
                  value={form.description}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, description: e.target.value }))
                  }
                  placeholder="Short marketing description"
                  rows={3}
                />
              </div>

              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="text-sm font-medium">Popular</p>
                  <p className="text-xs text-muted-foreground">
                    Highlight this package on the customer portal.
                  </p>
                </div>
                <Switch
                  checked={form.popular}
                  onCheckedChange={(c) => setForm((f) => ({ ...f, popular: c }))}
                />
              </div>

              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="text-sm font-medium">Active</p>
                  <p className="text-xs text-muted-foreground">
                    Inactive packages are hidden from customers.
                  </p>
                </div>
                <Switch
                  checked={form.active}
                  onCheckedChange={(c) => setForm((f) => ({ ...f, active: c }))}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={save} disabled={saving}>
              {saving ? (
                "Saving…"
              ) : (
                <>
                  <Check className="size-4" />
                  {editing ? "Save changes" : "Create package"}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete package?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <strong>{deleteId?.name}</strong>.
              This action cannot be undone.
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

function NumField({
  id,
  label,
  value,
  onChange,
}: {
  id: string
  label: string
  value: number
  onChange: (v: number) => void
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type="number"
        min={0}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  )
}
