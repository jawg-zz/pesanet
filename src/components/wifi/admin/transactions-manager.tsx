"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { Receipt, RefreshCw, Search, Smartphone, Ticket } from "lucide-react"
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
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { StatusBadge } from "@/components/wifi/status-badge"
import type { WifiTransaction } from "@/lib/types"
import { formatKES, timeAgo } from "@/lib/wifi-utils"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"

export function TransactionsManager() {
  const { toast } = useToast()
  const [tx, setTx] = useState<WifiTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")

  async function load() {
    setLoading(true)
    try {
      const res = await fetch("/api/transactions?limit=100")
      if (!res.ok) throw new Error("Failed to load")
      const data = (await res.json()) as { transactions: WifiTransaction[] }
      setTx(data.transactions ?? [])
    } catch {
      toast({
        title: "Error",
        description: "Could not load transactions.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const filtered = tx.filter((t) => {
    if (!search.trim()) return true
    const q = search.trim().toLowerCase()
    return (
      t.phone.toLowerCase().includes(q) ||
      (t.packageName ?? "").toLowerCase().includes(q) ||
      (t.mpesaRef ?? "").toLowerCase().includes(q)
    )
  })

  const totalAmount = filtered.reduce((s, t) => s + t.amountKES, 0)
  const completedCount = filtered.filter((t) => t.status === "completed").length

  return (
    <Card className="py-0">
      <CardHeader className="flex-col gap-3 px-5 pt-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <Receipt className="size-4 text-primary" />
            Transactions
            <span className="text-sm font-normal text-muted-foreground">
              ({filtered.length})
            </span>
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            {formatKES(totalAmount)} total · {completedCount} completed
          </p>
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

      <CardContent className="px-5 pb-5">
        <div className="max-h-[60vh] overflow-y-auto custom-scroll rounded-lg border">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-card">
              <TableRow>
                <TableHead>Phone</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Package</TableHead>
                <TableHead>Method</TableHead>
                <TableHead className="hidden md:table-cell">M-Pesa ref</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden sm:table-cell">Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
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
                      <Receipt className="size-6" />
                      <p className="text-sm font-medium">No transactions found</p>
                      <p className="text-xs">
                        Customer purchases will appear here.
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
                    className="hover:bg-muted/50 border-b transition-colors"
                  >
                    <TableCell className="font-mono text-xs">{t.phone}</TableCell>
                    <TableCell className="font-semibold text-primary">
                      {formatKES(t.amountKES)}
                    </TableCell>
                    <TableCell className="text-sm">
                      {t.packageName ?? "—"}
                    </TableCell>
                    <TableCell>
                      <MethodBadge method={t.method} />
                    </TableCell>
                    <TableCell className="hidden font-mono text-xs md:table-cell">
                      {t.mpesaRef ?? "—"}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={t.status} />
                    </TableCell>
                    <TableCell className="hidden text-xs text-muted-foreground sm:table-cell">
                      {timeAgo(t.createdAt)}
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

function MethodBadge({ method }: { method: string }) {
  const isMpesa = method.toLowerCase() === "mpesa"
  return (
    <Badge
      variant="outline"
      className={cn(
        "capitalize",
        isMpesa
          ? "border-transparent bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
          : "border-transparent bg-amber-500/15 text-amber-700 dark:text-amber-300"
      )}
    >
      {isMpesa ? <Smartphone className="size-3" /> : <Ticket className="size-3" />}
      {method}
    </Badge>
  )
}
