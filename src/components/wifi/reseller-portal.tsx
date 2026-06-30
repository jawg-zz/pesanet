"use client"

import { useCallback, useEffect, useState } from "react"
import { motion } from "framer-motion"
import {
  Copy,
  KeyRound,
  Loader2,
  LogOut,
  MapPin,
  Phone,
  Percent,
  Send,
  Sparkles,
  Store,
  Ticket,
  TrendingUp,
  Wallet,
} from "lucide-react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { StatusBadge } from "@/components/wifi/status-badge"
import { useAppStore } from "@/lib/store"
import type {
  ResellerStats,
  WifiPackage,
  WifiVoucher,
} from "@/lib/types"
import { formatKES, timeAgo } from "@/lib/wifi-utils"
import { useToast } from "@/hooks/use-toast"

export function ResellerPortal() {
  const resellerAuthed = useAppStore((s) => s.resellerAuthed)
  const resellerPhone = useAppStore((s) => s.resellerPhone)
  const setResellerAuthed = useAppStore((s) => s.setResellerAuthed)

  function logout() {
    setResellerAuthed(false)
  }

  if (!resellerAuthed || !resellerPhone) {
    return <ResellerLogin />
  }
  return (
    <ResellerDashboard
      phone={resellerPhone}
      onLogout={logout}
    />
  )
}

/* ============================================================
   LOGIN
============================================================ */
function ResellerLogin() {
  const { toast } = useToast()
  const setResellerAuthed = useAppStore((s) => s.setResellerAuthed)
  const [step, setStep] = useState<"phone" | "otp">("phone")
  const [phone, setPhone] = useState("")
  const [otp, setOtp] = useState("")
  const [shownOtp, setShownOtp] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const [verifying, setVerifying] = useState(false)

  async function sendOtp(e: React.FormEvent) {
    e.preventDefault()
    if (!phone.trim()) {
      toast({
        title: "Enter phone",
        description: "Please enter your reseller phone number.",
        variant: "destructive",
      })
      return
    }
    setSending(true)
    try {
      const res = await fetch("/api/reseller/otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phone.trim() }),
      })
      const data = await res.json()
      if (res.status === 404) {
        toast({
          title: "Reseller not found",
          description:
            "No reseller account exists for this phone. Contact admin to register.",
          variant: "destructive",
        })
        return
      }
      if (!res.ok) {
        throw new Error(data.error || data.message || "Could not send OTP")
      }
      setShownOtp(String(data.otp ?? ""))
      setStep("otp")
      toast({
        title: "OTP sent",
        description: data.message || "A demo OTP has been generated.",
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not send OTP"
      toast({
        title: "Failed",
        description: msg,
        variant: "destructive",
      })
    } finally {
      setSending(false)
    }
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault()
    if (!otp.trim()) {
      toast({
        title: "Enter OTP",
        description: "Please enter the code.",
        variant: "destructive",
      })
      return
    }
    setVerifying(true)
    try {
      const res = await fetch("/api/reseller/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phone.trim(), otp: otp.trim() }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error || data.message || "Invalid OTP")
      }
      toast({
        title: "Welcome 👋",
        description: `Signed in as ${data.name}.`,
      })
      setResellerAuthed(true, phone.trim(), data.name)
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Invalid OTP"
      toast({
        title: "Verification failed",
        description: msg,
        variant: "destructive",
      })
    } finally {
      setVerifying(false)
    }
  }

  return (
    <div className="mx-auto grid min-h-[70vh] w-full max-w-md place-items-center px-4 py-10">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full"
      >
        <Card className="overflow-hidden py-0">
          <div className="bg-gradient-to-r from-amber-500 to-amber-600 px-6 py-6 text-white">
            <div className="flex items-center gap-3">
              <div className="grid size-10 place-items-center rounded-lg bg-white/15">
                <Store className="size-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold">Reseller Portal</h2>
                <p className="text-xs text-white/90">
                  Buy vouchers at commission and resell
                </p>
              </div>
            </div>
          </div>

          <CardHeader>
            <CardTitle>
              {step === "phone" ? "Sign in with phone" : "Verify OTP"}
            </CardTitle>
            <CardDescription>
              {step === "phone"
                ? "We'll send a one-time code to your reseller phone."
                : "Enter the code we just sent you."}
            </CardDescription>
          </CardHeader>

          <CardContent>
            {step === "phone" ? (
              <form onSubmit={sendOtp} className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="rp-phone">Reseller phone</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="rp-phone"
                      inputMode="tel"
                      placeholder="254722111111"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>
                <Button type="submit" size="lg" disabled={sending}>
                  {sending ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Sending…
                    </>
                  ) : (
                    <>
                      <Send className="size-4" />
                      Send OTP
                    </>
                  )}
                </Button>
                <p className="text-center text-xs text-muted-foreground">
                  Demo resellers:{" "}
                  <span className="font-mono">254722111111</span>,{" "}
                  <span className="font-mono">254722222222</span>
                </p>
              </form>
            ) : (
              <form onSubmit={verify} className="flex flex-col gap-4">
                {shownOtp && (
                  <div className="flex items-start gap-3 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
                    <Sparkles className="size-4 shrink-0 text-amber-600 dark:text-amber-400" />
                    <div>
                      <p className="font-medium text-amber-800 dark:text-amber-200">
                        Demo OTP:{" "}
                        <span className="font-mono text-base tracking-widest">
                          {shownOtp}
                        </span>
                      </p>
                      <p className="text-xs text-amber-700/80 dark:text-amber-300/80">
                        In production this code is sent via SMS.
                      </p>
                    </div>
                  </div>
                )}
                <div className="flex flex-col gap-2">
                  <Label htmlFor="rp-otp">OTP code</Label>
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="rp-otp"
                      inputMode="numeric"
                      placeholder="1234"
                      value={otp}
                      onChange={(e) =>
                        setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
                      }
                      className="pl-9 font-mono tracking-widest"
                    />
                  </div>
                </div>
                <Button type="submit" size="lg" disabled={verifying}>
                  {verifying ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Verifying…
                    </>
                  ) : (
                    <>
                      <KeyRound className="size-4" />
                      Verify & sign in
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setStep("phone")
                    setOtp("")
                    setShownOtp(null)
                  }}
                >
                  ← Use a different phone
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}

/* ============================================================
   DASHBOARD
============================================================ */
function ResellerDashboard({
  phone,
  onLogout,
}: {
  phone: string
  onLogout: () => void
}) {
  const { toast } = useToast()
  const [stats, setStats] = useState<ResellerStats | null>(null)
  const [packages, setPackages] = useState<WifiPackage[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [meRes, pkgRes] = await Promise.all([
        fetch(`/api/reseller/me?phone=${encodeURIComponent(phone)}`),
        fetch("/api/packages?active=true"),
      ])
      if (!meRes.ok) throw new Error("Failed to load reseller data")
      const meData = (await meRes.json()) as ResellerStats
      setStats(meData)
      const pkgData = (await pkgRes.json()) as { packages: WifiPackage[] }
      setPackages(pkgData.packages ?? [])
    } catch {
      toast({
        title: "Error",
        description: "Could not load your reseller dashboard.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [phone, toast])

  useEffect(() => {
    load()
  }, [load])

  if (loading || !stats) {
    return (
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
        <Skeleton className="h-28 rounded-xl" />
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <div className="mt-5 grid gap-5 lg:grid-cols-2">
          <Skeleton className="h-72 rounded-xl" />
          <Skeleton className="h-72 rounded-xl" />
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Card className="overflow-hidden py-0">
          <div className="bg-gradient-to-r from-amber-500 to-amber-600 px-5 py-5 text-white sm:px-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <div className="grid size-12 place-items-center rounded-lg bg-white/15">
                  <Store className="size-6" />
                </div>
                <div>
                  <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
                    Reseller Dashboard
                  </h1>
                  <p className="flex items-center gap-1.5 text-sm text-white/90">
                    <Phone className="size-3.5" />
                    <span className="font-mono">{phone}</span>
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-white/80">
                    <span className="flex items-center gap-1">
                      <Percent className="size-3" />
                      {stats.commissionRate}% commission
                    </span>
                    <span aria-hidden>·</span>
                    <span className="flex items-center gap-1">
                      <MapPin className="size-3" />
                      Reseller portal
                    </span>
                  </div>
                </div>
              </div>
              <Button
                variant="secondary"
                onClick={onLogout}
                className="bg-white/15 text-white hover:bg-white/25 hover:text-white"
              >
                <LogOut className="size-4" />
                Logout
              </Button>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Stat cards */}
      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={<Wallet className="size-5" />}
          label="Wallet Balance"
          value={formatKES(stats.walletBalanceKES)}
          tone="emerald"
          delay={0}
        />
        <StatCard
          icon={<TrendingUp className="size-5" />}
          label="Total Earned"
          value={formatKES(stats.totalEarnedKES)}
          tone="amber"
          delay={0.05}
        />
        <StatCard
          icon={<Store className="size-5" />}
          label="Total Sales"
          value={formatKES(stats.totalSalesKES)}
          tone="primary"
          delay={0.1}
        />
        <StatCard
          icon={<Percent className="size-5" />}
          label="Commission Rate"
          value={`${stats.commissionRate}%`}
          tone="primary"
          delay={0.15}
        />
      </div>

      {/* Buy vouchers + my vouchers */}
      <div className="mt-6 grid gap-5 lg:grid-cols-3">
        <BuyVouchersCard
          packages={packages}
          commissionRate={stats.commissionRate}
          phone={phone}
          onPurchased={load}
        />

        <Card className="lg:col-span-2 py-0">
          <CardHeader className="px-5 pt-5">
            <CardTitle className="flex items-center gap-2 text-base">
              <Ticket className="size-4 text-primary" />
              My recent vouchers
              <span className="text-sm font-normal text-muted-foreground">
                ({stats.recentVouchers?.length ?? 0})
              </span>
            </CardTitle>
            <CardDescription>
              {stats.vouchersSold} sold · {stats.vouchersUnsold} unsold
            </CardDescription>
          </CardHeader>
          <CardContent className="px-2 pb-3 sm:px-4">
            <div className="max-h-[60vh] overflow-y-auto custom-scroll rounded-lg border">
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-card">
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead className="hidden sm:table-cell">Package</TableHead>
                    <TableHead className="hidden md:table-cell">Price</TableHead>
                    <TableHead className="hidden lg:table-cell">Used by</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats.recentVouchers && stats.recentVouchers.length > 0 ? (
                    stats.recentVouchers.map((v: WifiVoucher) => (
                      <TableRow key={v.id} className="hover:bg-muted/50">
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
                        <TableCell className="hidden text-sm sm:table-cell">
                          {v.packageName}
                        </TableCell>
                        <TableCell className="hidden text-sm md:table-cell">
                          {formatKES(v.priceKES)}
                        </TableCell>
                        <TableCell className="hidden font-mono text-xs lg:table-cell">
                          {v.usedBy ?? "—"}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={v.status} />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="py-10 text-center">
                        <div className="flex flex-col items-center gap-2 text-muted-foreground">
                          <Ticket className="size-5" />
                          <p className="text-sm">
                            No vouchers yet — buy your first batch.
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent sales */}
      <Card className="mt-5 py-0">
        <CardHeader className="px-5 pt-5">
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="size-4 text-primary" />
            My recent sales
          </CardTitle>
          <CardDescription>
            Commission earned on completed sales.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-2 pb-3 sm:px-4">
          {stats.recentSales && stats.recentSales.length > 0 ? (
            <ul className="max-h-[40vh] overflow-y-auto custom-scroll">
              {stats.recentSales.map((t) => (
                <li
                  key={t.id}
                  className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm hover:bg-muted/40 border-b last:border-0"
                >
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate font-medium">
                      {t.packageName ?? "Voucher"}
                    </span>
                    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <span className="font-mono">{t.phone}</span>
                      <span aria-hidden>·</span>
                      {timeAgo(t.createdAt)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-primary">
                      {formatKES(t.amountKES)}
                    </span>
                    <StatusBadge status={t.status} />
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="flex flex-col items-center gap-2 px-4 py-10 text-muted-foreground">
              <TrendingUp className="size-5" />
              <p className="text-sm">No sales yet.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

/* ============================================================
   BUY VOUCHERS CARD
============================================================ */
function BuyVouchersCard({
  packages,
  commissionRate,
  phone,
  onPurchased,
}: {
  packages: WifiPackage[]
  commissionRate: number
  phone: string
  onPurchased: () => void
}) {
  const { toast } = useToast()
  const [pkgId, setPkgId] = useState<string>(packages[0]?.id ?? "")
  const [count, setCount] = useState<number>(1)
  const [buying, setBuying] = useState(false)
  const [generated, setGenerated] = useState<WifiVoucher[]>([])

  // Sync default package
  useEffect(() => {
    if (!pkgId && packages.length > 0) setPkgId(packages[0].id)
  }, [packages, pkgId])

  const pkg = packages.find((p) => p.id === pkgId)
  const unitCost = pkg
    ? Math.round(pkg.priceKES * (1 - commissionRate / 100))
    : 0
  const totalCost = unitCost * count

  async function buy() {
    if (!pkgId) {
      toast({
        title: "Select package",
        description: "Pick a package first.",
        variant: "destructive",
      })
      return
    }
    if (count < 1 || count > 50) {
      toast({
        title: "Invalid count",
        description: "Count must be between 1 and 50.",
        variant: "destructive",
      })
      return
    }
    setBuying(true)
    try {
      const res = await fetch("/api/reseller/buy-vouchers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, packageId: pkgId, count }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || data.message || "Could not buy vouchers")
      }
      setGenerated(data.vouchers ?? [])
      toast({
        title: "Vouchers purchased 🎉",
        description: `${data.vouchers?.length ?? 0} codes generated. Wallet updated.`,
      })
      onPurchased()
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not buy vouchers"
      toast({
        title: "Purchase failed",
        description: msg,
        variant: "destructive",
      })
    } finally {
      setBuying(false)
    }
  }

  function copyAll() {
    if (generated.length === 0) return
    const text = generated.map((v) => v.code).join("\n")
    navigator.clipboard?.writeText(text)
    toast({
      title: "Copied",
      description: `${generated.length} codes copied to clipboard.`,
    })
  }

  return (
    <Card className="py-0">
      <CardHeader className="px-5 pt-5">
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="size-4 text-primary" />
          Buy vouchers
        </CardTitle>
        <CardDescription>
          Buy at <span className="font-semibold text-primary">{commissionRate}%</span> off
          retail and resell for profit.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 px-5 pb-5">
        <div className="flex flex-col gap-2">
          <Label htmlFor="buy-pkg">Package</Label>
          <Select value={pkgId} onValueChange={setPkgId}>
            <SelectTrigger id="buy-pkg" className="w-full">
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
          <Label htmlFor="buy-count">Count (1–50)</Label>
          <Input
            id="buy-count"
            type="number"
            min={1}
            max={50}
            value={count}
            onChange={(e) => setCount(Math.max(1, Math.min(50, Number(e.target.value) || 1)))}
          />
        </div>

        {pkg && (
          <div className="rounded-lg border bg-muted/40 p-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Retail price</span>
              <span>{formatKES(pkg.priceKES)}</span>
            </div>
            <div className="mt-1 flex items-center justify-between">
              <span className="text-muted-foreground">Your unit cost</span>
              <span className="font-medium text-primary">{formatKES(unitCost)}</span>
            </div>
            <Separator className="my-2" />
            <div className="flex items-center justify-between">
              <span className="font-medium">Total cost</span>
              <span className="text-lg font-bold text-primary">
                {formatKES(totalCost)}
              </span>
            </div>
            <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
              <span>Profit if all sold</span>
              <span className="text-emerald-600 dark:text-emerald-400">
                +{formatKES((pkg.priceKES - unitCost) * count)}
              </span>
            </div>
          </div>
        )}

        <Button onClick={buy} disabled={buying || !pkg} className="w-full">
          {buying ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Buying…
            </>
          ) : (
            <>
              <Ticket className="size-4" />
              Buy {count} voucher{count === 1 ? "" : "s"}
            </>
          )}
        </Button>

        {generated.length > 0 && (
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-sm font-medium">
                <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
                  {generated.length} codes
                </Badge>
                Generated
              </span>
              <Button size="sm" variant="outline" onClick={copyAll}>
                <Copy className="size-3.5" />
                Copy all
              </Button>
            </div>
            <div className="max-h-44 overflow-y-auto custom-scroll rounded-lg border bg-muted/30 p-3">
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

        <div className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/5 p-3 text-xs">
          <Wallet className="size-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <p className="text-muted-foreground">
            <span className="font-semibold">Top up wallet:</span> Contact your
            PesaNet admin to add credit to your wallet.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

/* ============================================================
   SHARED STAT CARD
============================================================ */
function StatCard({
  icon,
  label,
  value,
  tone,
  delay = 0,
}: {
  icon: React.ReactNode
  label: string
  value: string
  tone: "primary" | "emerald" | "amber"
  delay?: number
}) {
  const toneClass =
    tone === "primary"
      ? "bg-primary/10 text-primary"
      : tone === "emerald"
      ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300"
      : "bg-amber-500/15 text-amber-600 dark:text-amber-300"
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
    >
      <Card className="py-0">
        <CardContent className="flex items-center gap-4 p-5">
          <div className={`grid size-12 place-items-center rounded-xl ${toneClass}`}>
            {icon}
          </div>
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="truncate text-xl font-bold tracking-tight">{value}</p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
