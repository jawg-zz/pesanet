"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { Copy, Plus, RefreshCw, Search, Ticket } from "lucide-react"
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
import { StatusBadge } from "@/components/wifi/status-badge"
import type { WifiPackage, WifiVoucher } from "@/lib/types"
import { formatKES, timeAgo } from "@/lib/wifi-utils"
import { useToast } from "@/hooks/use-toast"

type Filter = "unused" | "used" | "all"

export function VouchersManager() {
  const { toast } = useToast()
  const [vouchers, setVouchers] = useState<WifiVoucher[]>([])
  const [packages, setPackages] = useState<WifiPackage[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<Filter>("unused")
  const [search, setSearch] = useState("")
  const [open, setOpen] = useState(false)
  const [pkgId, setPkgId] = useState<string>("")
  const [count, setCount] = useState<number>(5)
  const [generating, setGenerating] = useState(false)
  const [generated, setGenerated] = useState<WifiVoucher[]>([])

  async function load() {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filter !== "all") params.set("status", filter)
      const [vres, pres] = await Promise.all([
        fetch(`/api/vouchers?${params.toString()}`),
        fetch("/api/packages"),
      ])
      const vdata = (await vres.json()) as { vouchers: WifiVoucher[] }
      const pdata = (await pres.json()) as { packages: WifiPackage[] }
      setVouchers(vdata.vouchers ?? [])
      setPackages(pdata.packages ?? [])
      if (pdata.packages?.length && !pkgId) {
        setPkgId(pdata.packages[0].id)
      }
    } catch {
      toast({
        title: "Error",
        description: "Could not load vouchers.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [filter])

  async function generate() {
    if (!pkgId) {
      toast({
        title: "Select package",
        description: "Pick a package first.",
        variant: "destructive",
      })
      return
    }
    if (count < 1 || count > 100) {
      toast({
        title: "Invalid count",
        description: "Count must be between 1 and 100.",
        variant: "destructive",
      })
      return
    }
    setGenerating(true)
    try {
      const res = await fetch("/api/vouchers/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packageId: pkgId, count }),
      })
      if (!res.ok) throw new Error("Failed to generate")
      const data = (await res.json()) as { vouchers: WifiVoucher[] }
      setGenerated(data.vouchers ?? [])
      toast({
        title: "Vouchers generated",
        description: `${data.vouchers?.length ?? 0} voucher codes created.`,
      })
      load()
    } catch {
      toast({
        title: "Error",
        description: "Could not generate vouchers.",
        variant: "destructive",
      })
    } finally {
      setGenerating(false)
    }
  }

  function copyAll() {
    if (generated.length === 0) return
    const text = generated.map((v) => v.code).join("\n")
    navigator.clipboard?.writeText(text)
    toast({
      title: "Copied",
      description: `${generated.length} voucher codes copied.`,
    })
  }

  const filtered = vouchers.filter((v) => {
    if (!search.trim()) return true
    const q = search.trim().toLowerCase()
    return (
      v.code.toLowerCase().includes(q) ||
      v.packageName.toLowerCase().includes(q) ||
      (v.usedBy ?? "").toLowerCase().includes(q)
    )
  })

  return (
    <Card className="py-0">
      <CardHeader className="flex-col gap-3 px-5 pt-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <Ticket className="size-4 text-primary" />
            Vouchers
            <span className="text-sm font-normal text-muted-foreground">
              ({filtered.length})
            </span>
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Generate codes that customers can redeem for sessions.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="icon" onClick={load} aria-label="Refresh">
            <RefreshCw className="size-4" />
          </Button>
          <Button
            onClick={() => {
              setGenerated([])
              setOpen(true)
            }}
          >
            <Plus className="size-4" />
            <span className="hidden sm:inline">Generate Vouchers</span>
          </Button>
        </div>
      </CardHeader>

      <CardContent className="flex flex-col gap-4 px-5 pb-5">
        <div className="flex flex-wrap items-center gap-2">
          <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)}>
            <TabsList>
              <TabsTrigger value="unused">Unused</TabsTrigger>
              <TabsTrigger value="used">Used</TabsTrigger>
              <TabsTrigger value="all">All</TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search code, package, used by…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <div className="max-h-[60vh] overflow-y-auto custom-scroll rounded-lg border">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-card">
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Package</TableHead>
                <TableHead className="hidden md:table-cell">Price</TableHead>
                <TableHead className="hidden lg:table-cell">Used by</TableHead>
                <TableHead className="hidden md:table-cell">Used at</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 6 }).map((__, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-12 text-center">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <Ticket className="size-6" />
                      <p className="text-sm font-medium">No vouchers found</p>
                      <p className="text-xs">
                        Generate new codes with the button above.
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((v, i) => (
                  <motion.tr
                    key={v.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: Math.min(i * 0.02, 0.2) }}
                    className="hover:bg-muted/50 border-b transition-colors"
                  >
                    <TableCell>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard?.writeText(v.code)
                          toast({ title: "Copied", description: v.code })
                        }}
                        className="flex items-center gap-2 font-mono text-xs font-medium hover:text-primary"
                      >
                        {v.code}
                        <Copy className="size-3 opacity-50" />
                      </button>
                    </TableCell>
                    <TableCell className="text-sm">{v.packageName}</TableCell>
                    <TableCell className="hidden text-sm md:table-cell">
                      {formatKES(v.priceKES)}
                    </TableCell>
                    <TableCell className="hidden text-xs font-mono lg:table-cell">
                      {v.usedBy ?? "—"}
                    </TableCell>
                    <TableCell className="hidden text-xs text-muted-foreground md:table-cell">
                      {v.usedAt ? timeAgo(v.usedAt) : "—"}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={v.status} />
                    </TableCell>
                  </motion.tr>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      {/* Generate dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Generate vouchers</DialogTitle>
            <DialogDescription>
              Create batch voucher codes tied to a package.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="voucher-pkg">Package</Label>
              <Select value={pkgId} onValueChange={setPkgId}>
                <SelectTrigger id="voucher-pkg" className="w-full">
                  <SelectValue placeholder="Select package" />
                </SelectTrigger>
                <SelectContent>
                  {packages.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} — {formatKES(p.priceKES)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="voucher-count">Count (1–100)</Label>
              <Input
                id="voucher-count"
                type="number"
                min={1}
                max={100}
                value={count}
                onChange={(e) => setCount(Number(e.target.value))}
              />
            </div>

            {generated.length > 0 && (
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">
                    {generated.length} codes generated
                  </span>
                  <Button size="sm" variant="outline" onClick={copyAll}>
                    <Copy className="size-3.5" />
                    Copy all
                  </Button>
                </div>
                <div className="max-h-48 overflow-y-auto custom-scroll rounded-lg border bg-muted/30 p-3">
                  <div className="grid gap-1 font-mono text-xs">
                    {generated.map((v) => (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => {
                          navigator.clipboard?.writeText(v.code)
                          toast({ title: "Copied", description: v.code })
                        }}
                        className="text-left hover:text-primary"
                      >
                        {v.code}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Close
            </Button>
            <Button onClick={generate} disabled={generating}>
              {generating ? "Generating…" : "Generate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
