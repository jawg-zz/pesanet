"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { Crown, RefreshCw, Search, Users } from "lucide-react"
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import type { AdminCustomer } from "@/lib/types"
import { formatKES, timeAgo } from "@/lib/wifi-utils"
import { useToast } from "@/hooks/use-toast"

export function CustomersManager() {
  const { toast } = useToast()
  const [customers, setCustomers] = useState<AdminCustomer[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")

  async function load() {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/customers")
      if (!res.ok) throw new Error("Failed to load")
      const data = (await res.json()) as { customers: AdminCustomer[] }
      setCustomers(data.customers ?? [])
    } catch {
      toast({
        title: "Error",
        description: "Could not load customers.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const filtered = customers.filter((c) => {
    if (!search.trim()) return true
    const q = search.trim().toLowerCase()
    return (
      c.phone.toLowerCase().includes(q) ||
      (c.name ?? "").toLowerCase().includes(q)
    )
  })

  const topCustomers = [...customers]
    .sort((a, b) => b.totalSpent - a.totalSpent)
    .slice(0, 3)

  const totalSpent = customers.reduce((s, c) => s + c.totalSpent, 0)
  const totalSessions = customers.reduce((s, c) => s + c.sessionCount, 0)

  return (
    <Card className="py-0">
      <CardHeader className="flex-col gap-3 px-5 pt-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="size-4 text-primary" />
            Customers
            <span className="text-sm font-normal text-muted-foreground">
              ({filtered.length})
            </span>
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            {formatKES(totalSpent)} lifetime · {totalSessions} sessions
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search phone or name…"
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

      <CardContent className="flex flex-col gap-5 px-5 pb-5">
        {/* Top customers */}
        {!loading && topCustomers.length > 0 && (
          <div className="grid gap-3 sm:grid-cols-3">
            {topCustomers.map((c, i) => (
              <motion.div
                key={c.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-center gap-3 rounded-xl border bg-gradient-to-br from-card to-muted/30 p-4"
              >
                <div className="relative">
                  <Avatar className="size-12">
                    <AvatarFallback className="bg-primary/10 text-primary font-bold">
                      {(c.name ?? c.phone).slice(-2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  {i === 0 && (
                    <div className="absolute -right-1 -top-1 grid size-5 place-items-center rounded-full bg-amber-500 text-white">
                      <Crown className="size-3" />
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="truncate font-semibold">
                    {c.name ?? "Unknown"}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {c.phone}
                  </p>
                  <p className="mt-0.5 text-sm font-bold text-primary">
                    {formatKES(c.totalSpent)}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        <div className="max-h-[55vh] overflow-y-auto custom-scroll rounded-lg border">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-card">
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead className="hidden md:table-cell">Joined</TableHead>
                <TableHead>Sessions</TableHead>
                <TableHead>Total spent</TableHead>
                <TableHead className="hidden lg:table-cell">Last active</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 5 }).map((__, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-12 text-center">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <Users className="size-6" />
                      <p className="text-sm font-medium">No customers found</p>
                      <p className="text-xs">
                        Customers appear after their first purchase.
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((c, i) => (
                  <motion.tr
                    key={c.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: Math.min(i * 0.02, 0.2) }}
                    className="hover:bg-muted/50 border-b transition-colors"
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="size-9">
                          <AvatarFallback className="bg-primary/10 text-xs font-bold text-primary">
                            {(c.name ?? c.phone).slice(-2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="truncate font-medium">
                            {c.name ?? "Unknown"}
                          </p>
                          <p className="truncate font-mono text-xs text-muted-foreground">
                            {c.phone}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden text-xs text-muted-foreground md:table-cell">
                      {timeAgo(c.createdAt)}
                    </TableCell>
                    <TableCell className="text-sm tabular-nums">
                      {c.sessionCount}
                    </TableCell>
                    <TableCell className="font-semibold text-primary">
                      {formatKES(c.totalSpent)}
                    </TableCell>
                    <TableCell className="hidden text-xs text-muted-foreground lg:table-cell">
                      {c.lastActive ? timeAgo(c.lastActive) : "—"}
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
