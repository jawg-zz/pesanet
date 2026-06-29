"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import {
  MapPin,
  Pencil,
  Phone,
  Plus,
  RefreshCw,
  Search,
  Store,
  Trash2,
  Wallet,
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
import { ResellerStatusBadge } from "@/components/wifi/feature-badges"
import type { Reseller } from "@/lib/types"
import { formatKES, timeAgo } from "@/lib/wifi-utils"
import { useToast } from "@/hooks/use-toast"

type ResellerRow = Reseller & {
  vouchersSold: number
  vouchersUnsold: number
}

interface FormState {
  phone: string
  name: string
  businessName: string
  location: string
  commissionRate: number
}

const emptyForm: FormState = {
  phone: "",
  name: "",
  businessName: "",
  location: "",
  commissionRate: 10,
}

export function ResellersManager() {
  const { toast } = useToast()
  const [resellers, setResellers] = useState<ResellerRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<ResellerRow | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<ResellerRow | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [topupTarget, setTopupTarget] = useState<ResellerRow | null>(null)
  const [topupAmount, setTopupAmount] = useState<number>(500)
  const [toppingUp, setToppingUp] = useState(false)

  async function load() {
    setLoading(true)
    try {
      const res = await fetch("/api/resellers")
      if (!res.ok) throw new Error("Failed to load")
      const data = (await res.json()) as { resellers: ResellerRow[] }
      setResellers(data.resellers ?? [])
    } catch {
      toast({
        title: "Error",
        description: "Could not load resellers.",
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
  function openEdit(r: ResellerRow) {
    setEditing(r)
    setForm({
      phone: r.phone,
      name: r.name,
      businessName: r.businessName ?? "",
      location: r.location ?? "",
      commissionRate: r.commissionRate,
    })
    setOpen(true)
  }

  async function save() {
    if (!form.phone.trim() || !form.name.trim()) {
      toast({
        title: "Missing fields",
        description: "Phone and name are required.",
        variant: "destructive",
      })
      return
    }
    setSaving(true)
    try {
      const body = {
        phone: form.phone.trim(),
        name: form.name.trim(),
        businessName: form.businessName.trim() || undefined,
        location: form.location.trim() || undefined,
        commissionRate: Number(form.commissionRate),
      }
      const res = editing
        ? await fetch(`/api/resellers/${editing.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          })
        : await fetch("/api/resellers", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.error || "Failed to save reseller")
      }
      toast({
        title: editing ? "Reseller updated" : "Reseller added",
        description: `${form.name} saved.`,
      })
      setOpen(false)
      load()
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not save reseller"
      toast({
        title: "Error",
        description: msg,
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  async function toggleStatus(r: ResellerRow) {
    const newStatus = r.status === "active" ? "suspended" : "active"
    try {
      const res = await fetch(`/api/resellers/${r.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      })
      if (!res.ok) throw new Error("Failed to update status")
      toast({
        title: newStatus === "active" ? "Reseller activated" : "Reseller suspended",
        description: `${r.name} is now ${newStatus}.`,
      })
      load()
    } catch {
      toast({
        title: "Error",
        description: "Could not update reseller status.",
        variant: "destructive",
      })
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/resellers/${deleteTarget.id}`, {
        method: "DELETE",
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.error || "Could not delete reseller")
      }
      toast({
        title: "Reseller deleted",
        description: `${deleteTarget.name} was removed.`,
      })
      setDeleteTarget(null)
      load()
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not delete reseller"
      toast({
        title: "Error",
        description: msg,
        variant: "destructive",
      })
    } finally {
      setDeleting(false)
    }
  }

  async function confirmTopup() {
    if (!topupTarget) return
    if (topupAmount <= 0) {
      toast({
        title: "Invalid amount",
        description: "Enter a positive amount.",
        variant: "destructive",
      })
      return
    }
    setToppingUp(true)
    try {
      const res = await fetch(`/api/resellers/${topupTarget.id}/topup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amountKES: topupAmount }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.error || "Could not top up wallet")
      }
      toast({
        title: "Wallet topped up",
        description: `Added ${formatKES(topupAmount)} to ${topupTarget.name}.`,
      })
      setTopupTarget(null)
      load()
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not top up wallet"
      toast({
        title: "Error",
        description: msg,
        variant: "destructive",
      })
    } finally {
      setToppingUp(false)
    }
  }

  const filtered = resellers.filter((r) => {
    if (!search.trim()) return true
    const q = search.trim().toLowerCase()
    return (
      r.name.toLowerCase().includes(q) ||
      r.phone.toLowerCase().includes(q) ||
      (r.businessName ?? "").toLowerCase().includes(q) ||
      (r.location ?? "").toLowerCase().includes(q)
    )
  })

  const totalWallet = resellers.reduce((s, r) => s + r.walletBalanceKES, 0)
  const totalEarned = resellers.reduce((s, r) => s + r.totalEarnedKES, 0)
  const totalSales = resellers.reduce((s, r) => s + r.totalSalesKES, 0)
  const activeCount = resellers.filter((r) => r.status === "active").length

  return (
    <Card className="py-0">
      <CardHeader className="flex-col gap-3 px-5 pt-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <Store className="size-4 text-primary" />
            Resellers
            <span className="text-sm font-normal text-muted-foreground">
              ({filtered.length})
            </span>
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            {activeCount} active · {formatKES(totalWallet)} wallet ·{" "}
            {formatKES(totalSales)} sold
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search name, phone…"
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
            <span className="hidden sm:inline">Add Reseller</span>
          </Button>
        </div>
      </CardHeader>

      <CardContent className="flex flex-col gap-4 px-5 pb-5">
        {/* Summary cards */}
        {!loading && resellers.length > 0 && (
          <div className="grid gap-3 sm:grid-cols-3">
            <SummaryCard
              icon={<Wallet className="size-4" />}
              label="Total wallet balance"
              value={formatKES(totalWallet)}
            />
            <SummaryCard
              icon={<Store className="size-4" />}
              label="Total sales"
              value={formatKES(totalSales)}
            />
            <SummaryCard
              icon={<RefreshCw className="size-4" />}
              label="Total commission paid"
              value={formatKES(totalEarned)}
            />
          </div>
        )}

        <div className="max-h-[60vh] overflow-y-auto custom-scroll rounded-lg border">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-card">
              <TableRow>
                <TableHead>Reseller</TableHead>
                <TableHead className="hidden md:table-cell">Location</TableHead>
                <TableHead>Commission</TableHead>
                <TableHead>Wallet</TableHead>
                <TableHead className="hidden lg:table-cell">Sold/Unsold</TableHead>
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
                      <Store className="size-6" />
                      <p className="text-sm font-medium">No resellers found</p>
                      <p className="text-xs">Add your first reseller to get started.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((r, i) => (
                  <motion.tr
                    key={r.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: Math.min(i * 0.02, 0.2) }}
                    className="hover:bg-muted/50 border-b transition-colors"
                  >
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{r.name}</span>
                        <span className="font-mono text-xs text-muted-foreground">
                          {r.phone}
                        </span>
                        {r.businessName && (
                          <span className="text-xs text-muted-foreground">
                            {r.businessName}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="hidden text-sm text-muted-foreground md:table-cell">
                      {r.location ? (
                        <span className="flex items-center gap-1">
                          <MapPin className="size-3" />
                          {r.location}
                        </span>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="text-sm font-medium text-primary">
                      {r.commissionRate}%
                    </TableCell>
                    <TableCell className="text-sm font-medium">
                      {formatKES(r.walletBalanceKES)}
                    </TableCell>
                    <TableCell className="hidden text-xs text-muted-foreground lg:table-cell">
                      <span className="text-emerald-600 dark:text-emerald-400">
                        {r.vouchersSold} sold
                      </span>{" "}
                      /{" "}
                      <span className="text-amber-600 dark:text-amber-400">
                        {r.vouchersUnsold} unsold
                      </span>
                    </TableCell>
                    <TableCell>
                      <ResellerStatusBadge status={r.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setTopupTarget(r)
                            setTopupAmount(500)
                          }}
                          aria-label={`Top up ${r.name}`}
                          title="Top up wallet"
                        >
                          <Wallet className="size-4 text-emerald-600" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openEdit(r)}
                          aria-label={`Edit ${r.name}`}
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => toggleStatus(r)}
                          aria-label="Toggle status"
                          title={r.status === "active" ? "Suspend" : "Activate"}
                        >
                          <Store className="size-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setDeleteTarget(r)}
                          aria-label={`Delete ${r.name}`}
                        >
                          <Trash2 className="size-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </motion.tr>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      {/* Create / edit dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Edit reseller" : "Add reseller"}
            </DialogTitle>
            <DialogDescription>
              {editing
                ? "Update reseller details."
                : "Register a new voucher reseller."}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="r-name">Name *</Label>
              <Input
                id="r-name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Joseph Kamau"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="r-phone">Phone *</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="r-phone"
                  inputMode="tel"
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  placeholder="254722111111"
                  className="pl-9"
                  disabled={!!editing}
                />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="r-business">Business name</Label>
              <Input
                id="r-business"
                value={form.businessName}
                onChange={(e) =>
                  setForm((f) => ({ ...f, businessName: e.target.value }))
                }
                placeholder="Kamau Cyber Cafe"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="r-location">Location</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="r-location"
                  value={form.location}
                  onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                  placeholder="Nairobi"
                  className="pl-9"
                />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="r-commission">Commission rate (%)</Label>
              <Input
                id="r-commission"
                type="number"
                min={0}
                max={50}
                value={form.commissionRate}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    commissionRate: Number(e.target.value),
                  }))
                }
              />
              <p className="text-xs text-muted-foreground">
                Reseller pays <span className="font-medium">{100 - form.commissionRate}%</span> of retail
                price; keeps <span className="font-medium text-primary">{form.commissionRate}%</span> as commission.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={save} disabled={saving}>
              {saving ? "Saving…" : editing ? "Save changes" : "Add reseller"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Top up dialog */}
      <Dialog open={!!topupTarget} onOpenChange={(o) => !o && setTopupTarget(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Top up wallet</DialogTitle>
            <DialogDescription>
              Add credit to <strong>{topupTarget?.name}</strong>'s wallet.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <div className="rounded-md border bg-muted/40 p-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Current balance</span>
                <span className="font-medium">
                  {formatKES(topupTarget?.walletBalanceKES ?? 0)}
                </span>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="topup-amount">Amount (KES)</Label>
              <Input
                id="topup-amount"
                type="number"
                min={1}
                value={topupAmount}
                onChange={(e) => setTopupAmount(Number(e.target.value))}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {[100, 500, 1000, 5000].map((amt) => (
                <Button
                  key={amt}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setTopupAmount(amt)}
                >
                  +{formatKES(amt)}
                </Button>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTopupTarget(null)}>
              Cancel
            </Button>
            <Button onClick={confirmTopup} disabled={toppingUp}>
              {toppingUp ? "Topping up…" : "Top up"}
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
            <AlertDialogTitle>Delete reseller?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <strong>{deleteTarget?.name}</strong>
              {deleteTarget?.createdAt && (
                <> (joined {timeAgo(deleteTarget.createdAt)})</>
              )}
              . This action cannot be undone.
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

function SummaryCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border bg-muted/30 p-4">
      <div className="grid size-10 place-items-center rounded-lg bg-primary/10 text-primary">
        {icon}
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-lg font-bold">{value}</p>
      </div>
    </div>
  )
}
