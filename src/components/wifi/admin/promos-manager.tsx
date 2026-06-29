"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import {
  Calendar,
  Check,
  Loader2,
  Percent,
  Plus,
  RefreshCw,
  Search,
  Tag,
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
import type { PromoCode } from "@/lib/types"
import { formatKES, timeAgo } from "@/lib/wifi-utils"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"

interface FormState {
  code: string
  description: string
  discountType: "percent" | "fixed"
  discountValue: number
  maxUses: number
  expiresAt: string
}

const emptyForm: FormState = {
  code: "",
  description: "",
  discountType: "percent",
  discountValue: 10,
  maxUses: 0,
  expiresAt: "",
}

function isExpired(promo: PromoCode): boolean {
  if (!promo.expiresAt) return false
  return new Date(promo.expiresAt).getTime() <= Date.now()
}

export function PromosManager() {
  const { toast } = useToast()
  const [promos, setPromos] = useState<PromoCode[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<PromoCode | null>(null)
  const [deleting, setDeleting] = useState(false)

  async function load() {
    setLoading(true)
    try {
      const res = await fetch("/api/promos")
      if (!res.ok) throw new Error("Failed to load")
      const data = (await res.json()) as { promos: PromoCode[] }
      setPromos(data.promos ?? [])
    } catch {
      toast({
        title: "Error",
        description: "Could not load promo codes.",
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
    setForm(emptyForm)
    setOpen(true)
  }

  async function save() {
    if (!form.code.trim() || !form.description.trim()) {
      toast({
        title: "Missing fields",
        description: "Code and description are required.",
        variant: "destructive",
      })
      return
    }
    setSaving(true)
    try {
      const body = {
        code: form.code.trim().toUpperCase(),
        description: form.description.trim(),
        discountType: form.discountType,
        discountValue: Number(form.discountValue),
        maxUses: Number(form.maxUses),
        expiresAt: form.expiresAt
          ? new Date(form.expiresAt).toISOString()
          : undefined,
      }
      const res = await fetch("/api/promos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.error || "Could not create promo")
      }
      toast({
        title: "Promo created",
        description: `${body.code} is now ${body.discountType === "percent" ? `${body.discountValue}% off` : `${formatKES(body.discountValue)} off`}.`,
      })
      setOpen(false)
      load()
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not create promo"
      toast({
        title: "Error",
        description: msg,
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  async function toggleActive(p: PromoCode) {
    try {
      const res = await fetch(`/api/promos/${p.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !p.active }),
      })
      if (!res.ok) throw new Error("Failed to toggle")
      toast({
        title: p.active ? "Promo disabled" : "Promo enabled",
        description: `${p.code} is now ${p.active ? "inactive" : "active"}.`,
      })
      load()
    } catch {
      toast({
        title: "Error",
        description: "Could not update promo.",
        variant: "destructive",
      })
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/promos/${deleteTarget.id}`, {
        method: "DELETE",
      })
      if (!res.ok) throw new Error("Failed to delete")
      toast({
        title: "Promo deleted",
        description: `${deleteTarget.code} was removed.`,
      })
      setDeleteTarget(null)
      load()
    } catch {
      toast({
        title: "Error",
        description: "Could not delete promo.",
        variant: "destructive",
      })
    } finally {
      setDeleting(false)
    }
  }

  const filtered = promos.filter((p) => {
    if (!search.trim()) return true
    const q = search.trim().toLowerCase()
    return (
      p.code.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q)
    )
  })

  const activeCount = promos.filter(
    (p) => p.active && !isExpired(p)
  ).length
  const expiredCount = promos.filter(isExpired).length

  return (
    <Card className="py-0">
      <CardHeader className="flex-col gap-3 px-5 pt-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <Percent className="size-4 text-primary" />
            Promo Codes
            <span className="text-sm font-normal text-muted-foreground">
              ({filtered.length})
            </span>
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            {activeCount} active · {expiredCount} expired
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search code or desc…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 sm:w-56"
            />
          </div>
          <Button variant="outline" size="icon" onClick={load} aria-label="Refresh">
            <RefreshCw className="size-4" />
          </Button>
          <Button onClick={openCreate}>
            <Plus className="size-4" />
            <span className="hidden sm:inline">Create Promo</span>
          </Button>
        </div>
      </CardHeader>

      <CardContent className="px-5 pb-5">
        <div className="max-h-[60vh] overflow-y-auto custom-scroll rounded-lg border">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-card">
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead className="hidden md:table-cell">Description</TableHead>
                <TableHead>Discount</TableHead>
                <TableHead className="hidden sm:table-cell">Uses</TableHead>
                <TableHead className="hidden lg:table-cell">Expires</TableHead>
                <TableHead>Status</TableHead>
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
                      <Tag className="size-6" />
                      <p className="text-sm font-medium">No promo codes yet</p>
                      <p className="text-xs">
                        Create a promo code to offer customer discounts.
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((p, i) => {
                  const expired = isExpired(p)
                  return (
                    <motion.tr
                      key={p.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: Math.min(i * 0.02, 0.2) }}
                      className="hover:bg-muted/50 border-b transition-colors"
                    >
                      <TableCell>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard?.writeText(p.code)
                            toast({ title: "Copied", description: p.code })
                          }}
                          className="flex items-center gap-2 font-mono text-sm font-semibold tracking-wide hover:text-primary"
                        >
                          {p.code}
                          <Tag className="size-3 opacity-50" />
                        </button>
                      </TableCell>
                      <TableCell className="hidden max-w-xs text-xs text-muted-foreground md:table-cell">
                        <span className="line-clamp-2">{p.description}</span>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <Badge
                            variant="outline"
                            className={cn(
                              "w-fit",
                              p.discountType === "percent"
                                ? "border-transparent bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                                : "border-transparent bg-amber-500/15 text-amber-700 dark:text-amber-300"
                            )}
                          >
                            {p.discountType === "percent"
                              ? `${p.discountValue}% off`
                              : `${formatKES(p.discountValue)} off`}
                          </Badge>
                          <span className="mt-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                            {p.discountType}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="hidden text-xs text-muted-foreground sm:table-cell">
                        <span className="font-mono">
                          {p.usesCount}
                          {p.maxUses > 0 ? ` / ${p.maxUses}` : " / ∞"}
                        </span>
                      </TableCell>
                      <TableCell className="hidden text-xs text-muted-foreground lg:table-cell">
                        {p.expiresAt ? (
                          <span className="flex items-center gap-1">
                            <Calendar className="size-3" />
                            {timeAgo(p.expiresAt)}
                          </span>
                        ) : (
                          "Never"
                        )}
                      </TableCell>
                      <TableCell>
                        {expired ? (
                          <Badge variant="outline" className="border-transparent bg-muted text-muted-foreground">
                            Expired
                          </Badge>
                        ) : (
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={p.active}
                              onCheckedChange={() => toggleActive(p)}
                              aria-label="Toggle active"
                            />
                            <span className="text-xs">
                              {p.active ? "Active" : "Disabled"}
                            </span>
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setDeleteTarget(p)}
                          aria-label={`Delete ${p.code}`}
                        >
                          <Trash2 className="size-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </motion.tr>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      {/* Create dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Tag className="size-4 text-primary" />
              Create promo code
            </DialogTitle>
            <DialogDescription>
              Offer customers a discount at checkout.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="p-code">Code *</Label>
              <Input
                id="p-code"
                value={form.code}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    code: e.target.value.toUpperCase().replace(/\s/g, ""),
                  }))
                }
                placeholder="WELCOME10"
                className="font-mono tracking-wider"
              />
              <p className="text-xs text-muted-foreground">
                Uppercase letters and numbers recommended.
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="p-desc">Description *</Label>
              <Input
                id="p-desc"
                value={form.description}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
                placeholder="10% off for new customers"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-2">
                <Label htmlFor="p-type">Discount type</Label>
                <Select
                  value={form.discountType}
                  onValueChange={(v) =>
                    setForm((f) => ({
                      ...f,
                      discountType: v as "percent" | "fixed",
                    }))
                  }
                >
                  <SelectTrigger id="p-type" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percent">Percentage (%)</SelectItem>
                    <SelectItem value="fixed">Fixed (KES)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="p-value">
                  Value {form.discountType === "percent" ? "(%)" : "(KES)"}
                </Label>
                <Input
                  id="p-value"
                  type="number"
                  min={0}
                  value={form.discountValue}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      discountValue: Number(e.target.value),
                    }))
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-2">
                <Label htmlFor="p-max">Max uses (0 = ∞)</Label>
                <Input
                  id="p-max"
                  type="number"
                  min={0}
                  value={form.maxUses}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, maxUses: Number(e.target.value) }))
                  }
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="p-exp">Expires at (optional)</Label>
                <Input
                  id="p-exp"
                  type="date"
                  value={form.expiresAt}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, expiresAt: e.target.value }))
                  }
                />
              </div>
            </div>
            <div className="rounded-md border bg-muted/40 p-3 text-sm">
              <p className="font-medium">Preview</p>
              <p className="mt-1 text-muted-foreground">
                {form.code || "CODE"} →{" "}
                <span className="font-semibold text-primary">
                  {form.discountType === "percent"
                    ? `${form.discountValue || 0}% off`
                    : `${formatKES(form.discountValue || 0)} off`}
                </span>
              </p>
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
                  <Check className="size-4" />
                  Create promo
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
            <AlertDialogTitle>Delete promo code?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete{" "}
              <span className="font-mono font-semibold">{deleteTarget?.code}</span>.
              Customers will no longer be able to apply it.
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
