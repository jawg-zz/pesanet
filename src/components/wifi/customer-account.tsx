"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { motion } from "framer-motion"
import {
  Activity,
  Award,
  Clock,
  Copy,
  Edit3,
  Gift,
  KeyRound,
  LifeBuoy,
  Loader2,
  LogOut,
  Mail,
  MapPin,
  Phone,
  Plus,
  Receipt,
  Send,
  Share2,
  Smartphone,
  Sparkles,
  TrendingUp,
  User,
  UserCircle,
  Wallet,
  Wifi,
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
import { Textarea } from "@/components/ui/textarea"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { StatusBadge } from "@/components/wifi/status-badge"
import {
  CategoryBadge,
  PriorityBadge,
  TicketStatusBadge,
} from "@/components/wifi/feature-badges"
import { ActiveSessionCard } from "@/components/wifi/active-session-card"
import type {
  CustomerAccount,
  LoyaltySummary,
  RedeemOption,
  SupportTicket,
  WifiPackage,
  WifiSession,
} from "@/lib/types"
import {
  formatDateTime,
  formatKES,
  normaliseKePhone,
  pointsCostForPackage,
  pointsToNextTier,
  tierLabel,
  timeAgo,
  validateKePhone,
} from "@/lib/wifi-utils"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"

export function CustomerAccount() {
  const { toast } = useToast()
  // This component only mounts on the client when the user switches to the
  // "account" view, so reading sessionStorage in the lazy initializer is safe
  // (no SSR hydration mismatch for this subtree).
  const [authedPhone, setAuthedPhone] = useState<string | null>(() => {
    if (typeof window === "undefined") return null
    try {
      return window.sessionStorage.getItem("pesanet:customerPhone")
    } catch {
      return null
    }
  })

  function login(phone: string) {
    setAuthedPhone(phone)
    try {
      window.sessionStorage.setItem("pesanet:customerPhone", phone)
    } catch {
      /* ignore */
    }
  }

  function logout() {
    setAuthedPhone(null)
    try {
      window.sessionStorage.removeItem("pesanet:customerPhone")
    } catch {
      /* ignore */
    }
    toast({
      title: "Signed out",
      description: "You have been logged out of your account.",
    })
  }

  if (!authedPhone) {
    return <CustomerLogin onLogin={login} />
  }
  return <CustomerDashboard phone={authedPhone} onLogout={logout} />
}

/* ============================================================
   LOGIN (Phone + OTP)
============================================================ */
function CustomerLogin({ onLogin }: { onLogin: (phone: string) => void }) {
  const { toast } = useToast()
  const [step, setStep] = useState<"phone" | "otp">("phone")
  const [phone, setPhone] = useState("")
  const [otp, setOtp] = useState("")
  const [shownOtp, setShownOtp] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const [verifying, setVerifying] = useState(false)

  async function sendOtp(e: React.FormEvent) {
    e.preventDefault()
    if (!validateKePhone(phone)) {
      toast({
        title: "Invalid phone",
        description: "Enter a valid Kenyan number (07XXXXXXXX or 01XXXXXXXX).",
        variant: "destructive",
      })
      return
    }
    setSending(true)
    try {
      const res = await fetch("/api/customer/otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phone.trim() }),
      })
      const data = await res.json()
      if (res.status === 404) {
        toast({
          title: "Account not found",
          description:
            "No account exists for this phone. Buy a package first to create one.",
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
        description: "Please enter the 4-digit code.",
        variant: "destructive",
      })
      return
    }
    setVerifying(true)
    try {
      const res = await fetch("/api/customer/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phone.trim(), otp: otp.trim() }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error || data.message || "Invalid OTP")
      }
      toast({
        title: "Welcome back 👋",
        description: `Signed in as ${data.name ?? phone}.`,
      })
      onLogin(phone.trim())
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
          <div className="bg-gradient-to-r from-primary to-emerald-600 px-6 py-6 text-primary-foreground">
            <div className="flex items-center gap-3">
              <div className="grid size-10 place-items-center rounded-lg bg-white/15">
                <UserCircle className="size-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold">My Account</h2>
                <p className="text-xs text-primary-foreground/90">
                  Sign in with your phone to manage your account
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
                ? "We'll send a one-time code to your phone."
                : "Enter the code we just sent you."}
            </CardDescription>
          </CardHeader>

          <CardContent>
            {step === "phone" ? (
              <form onSubmit={sendOtp} className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="ca-phone">Phone number</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="ca-phone"
                      inputMode="tel"
                      placeholder="07XX XXX XXX"
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
                  Demo phones: <span className="font-mono">0712345678</span>,{" "}
                  <span className="font-mono">0712345107</span>
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
                  <Label htmlFor="ca-otp">OTP code</Label>
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="ca-otp"
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
function CustomerDashboard({
  phone,
  onLogout,
}: {
  phone: string
  onLogout: () => void
}) {
  const { toast } = useToast()
  const [account, setAccount] = useState<CustomerAccount | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(
        `/api/customer/account?phone=${encodeURIComponent(phone)}`
      )
      if (!res.ok) throw new Error("Failed to load account")
      const data = (await res.json()) as CustomerAccount
      setAccount(data)
    } catch {
      toast({
        title: "Error",
        description: "Could not load your account.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [phone, toast])

  useEffect(() => {
    load()
  }, [load])

  if (loading || !account) {
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

  const initials = (account.name ?? account.phone)
    .replace(/[^a-zA-Z0-9 ]/g, "")
    .slice(-2)
    .toUpperCase()

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
      {/* Header card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Card className="overflow-hidden py-0">
          <div className="bg-gradient-to-r from-primary to-emerald-600 px-5 py-5 text-primary-foreground sm:px-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <Avatar className="size-14 border-2 border-white/30">
                  <AvatarFallback className="bg-white/15 text-base font-bold text-white">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
                    {account.name ?? "My Account"}
                  </h1>
                  <p className="flex items-center gap-1.5 font-mono text-sm text-primary-foreground/90">
                    <Smartphone className="size-3.5" />
                    {account.phone}
                  </p>
                  <p className="mt-0.5 text-xs text-primary-foreground/80">
                    Joined {timeAgo(account.createdAt)}
                  </p>
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

      {/* Stats */}
      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={<Wallet className="size-5" />}
          label="Total Spent"
          value={formatKES(account.totalSpent)}
          tone="emerald"
          delay={0}
        />
        <StatCard
          icon={<Activity className="size-5" />}
          label="Sessions"
          value={String(account.sessionCount)}
          tone="primary"
          delay={0.05}
        />
        <StatCard
          icon={<Wifi className="size-5" />}
          label="Active Sessions"
          value={String(account.activeSessions?.length ?? 0)}
          tone="amber"
          delay={0.1}
        />
        <StatCard
          icon={<LifeBuoy className="size-5" />}
          label="Support Tickets"
          value={String(account.tickets?.length ?? 0)}
          tone="primary"
          delay={0.15}
        />
      </div>

      {/* Active sessions */}
      {account.activeSessions && account.activeSessions.length > 0 && (
        <section className="mt-6 flex flex-col gap-3">
          <h2 className="text-lg font-bold tracking-tight">Active sessions</h2>
          <div className="grid gap-4">
            {account.activeSessions.map((s) => (
              <ActiveSessionCard
                key={s.id}
                session={s}
                onDisconnected={load}
                onExpired={load}
                onExtended={load}
              />
            ))}
          </div>
        </section>
      )}

      {/* Loyalty & referrals */}
      <section className="mt-6 grid gap-5 lg:grid-cols-2">
        <LoyaltyCard phone={phone} />
        <ReferralCard phone={phone} />
      </section>

      {/* Profile + recent sessions */}
      <div className="mt-6 grid gap-5 lg:grid-cols-3">
        <ProfileCard account={account} onUpdated={load} />

        <Card className="lg:col-span-2 py-0">
          <CardHeader className="px-5 pt-5">
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock className="size-4 text-primary" />
              Recent sessions
            </CardTitle>
            <CardDescription>
              Your last {account.recentSessions?.length ?? 0} sessions.
            </CardDescription>
          </CardHeader>
          <CardContent className="px-2 pb-3 sm:px-4">
            <div className="max-h-[60vh] overflow-y-auto custom-scroll rounded-lg border">
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-card">
                  <TableRow>
                    <TableHead>Package</TableHead>
                    <TableHead className="hidden sm:table-cell">Started</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {account.recentSessions && account.recentSessions.length > 0 ? (
                    account.recentSessions.map((s: WifiSession) => (
                      <TableRow key={s.id} className="hover:bg-muted/50">
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium">{s.packageName}</span>
                            <span className="text-xs text-muted-foreground">
                              {formatDateTime(s.startTime)}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="hidden text-xs text-muted-foreground sm:table-cell">
                          {timeAgo(s.startTime)}
                        </TableCell>
                        <TableCell className="text-sm font-medium">
                          {formatKES(s.priceKES)}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={s.status} />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="py-10 text-center">
                        <div className="flex flex-col items-center gap-2 text-muted-foreground">
                          <Clock className="size-5" />
                          <p className="text-sm">No sessions yet.</p>
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

      {/* Transactions + tickets */}
      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        {/* Recent transactions */}
        <Card className="py-0">
          <CardHeader className="px-5 pt-5">
            <CardTitle className="flex items-center gap-2 text-base">
              <Receipt className="size-4 text-primary" />
              Recent transactions
            </CardTitle>
          </CardHeader>
          <CardContent className="px-2 pb-3 sm:px-4">
            {account.recentTransactions && account.recentTransactions.length > 0 ? (
              <ul className="max-h-[40vh] overflow-y-auto custom-scroll">
                {account.recentTransactions.map((t) => (
                  <li
                    key={t.id}
                    className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm hover:bg-muted/40 border-b last:border-0"
                  >
                    <div className="flex min-w-0 flex-col">
                      <span className="truncate font-medium">
                        {t.packageName ?? "Voucher"}
                      </span>
                      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        {t.method === "mpesa" ? (
                          <Smartphone className="size-3" />
                        ) : (
                          <Receipt className="size-3" />
                        )}
                        {t.mpesaRef ?? t.method}
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
                <Receipt className="size-5" />
                <p className="text-sm">No transactions yet.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tickets */}
        <TicketsCard
          phone={phone}
          tickets={account.tickets ?? []}
          onUpdated={load}
        />
      </div>
    </div>
  )
}

/* ============================================================
   PROFILE CARD
============================================================ */
function ProfileCard({
  account,
  onUpdated,
}: {
  account: CustomerAccount
  onUpdated: () => void
}) {
  const { toast } = useToast()
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(account.name ?? "")
  const [email, setEmail] = useState(account.email ?? "")
  const [location, setLocation] = useState(account.location ?? "")
  const [saving, setSaving] = useState(false)

  // Sync when account reloads
  useEffect(() => {
    setName(account.name ?? "")
    setEmail(account.email ?? "")
    setLocation(account.location ?? "")
  }, [account.name, account.email, account.location])

  async function save() {
    setSaving(true)
    try {
      const res = await fetch("/api/customer/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: account.phone,
          name: name.trim() || undefined,
          email: email.trim() || undefined,
          location: location.trim() || undefined,
        }),
      })
      if (!res.ok) throw new Error("Failed to update profile")
      toast({
        title: "Profile updated",
        description: "Your details have been saved.",
      })
      setEditing(false)
      onUpdated()
    } catch {
      toast({
        title: "Error",
        description: "Could not update profile.",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card className="py-0">
      <CardHeader className="flex-row items-center justify-between px-5 pt-5">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <User className="size-4 text-primary" />
            Profile
          </CardTitle>
          <CardDescription>Your personal details</CardDescription>
        </div>
        {!editing && (
          <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
            <Edit3 className="size-3.5" />
            Edit
          </Button>
        )}
      </CardHeader>
      <CardContent className="flex flex-col gap-4 px-5 pb-5">
        {editing ? (
          <>
            <div className="flex flex-col gap-2">
              <Label htmlFor="pf-name">Full name</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="pf-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="pl-9"
                  placeholder="Your name"
                />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="pf-email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="pf-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-9"
                  placeholder="you@example.com"
                />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="pf-loc">Location</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="pf-loc"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="pl-9"
                  placeholder="e.g. Nairobi"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setEditing(false)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button className="flex-1" onClick={save} disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Saving…
                  </>
                ) : (
                  "Save changes"
                )}
              </Button>
            </div>
          </>
        ) : (
          <div className="flex flex-col gap-3 text-sm">
            <ProfileRow
              icon={<User className="size-4" />}
              label="Name"
              value={account.name ?? "Not set"}
            />
            <ProfileRow
              icon={<Phone className="size-4" />}
              label="Phone"
              value={account.phone}
              mono
            />
            <ProfileRow
              icon={<Mail className="size-4" />}
              label="Email"
              value={account.email ?? "Not set"}
            />
            <ProfileRow
              icon={<MapPin className="size-4" />}
              label="Location"
              value={account.location ?? "Not set"}
            />
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function ProfileRow({
  icon,
  label,
  value,
  mono,
}: {
  icon: React.ReactNode
  label: string
  value: string
  mono?: boolean
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="flex items-center gap-2 text-muted-foreground">
        {icon}
        {label}
      </span>
      <span className={`font-medium ${mono ? "font-mono text-xs" : ""}`}>
        {value}
      </span>
    </div>
  )
}

/* ============================================================
   TICKETS CARD
============================================================ */
const TICKET_CATEGORIES = [
  { value: "billing", label: "Billing / Payment" },
  { value: "connectivity", label: "Connectivity / Speed" },
  { value: "voucher", label: "Voucher issue" },
  { value: "account", label: "Account access" },
  { value: "other", label: "Other" },
]
const TICKET_PRIORITIES = [
  { value: "low", label: "Low" },
  { value: "normal", label: "Normal" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
]

function TicketsCard({
  phone,
  tickets,
  onUpdated,
}: {
  phone: string
  tickets: SupportTicket[]
  onUpdated: () => void
}) {
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [subject, setSubject] = useState("")
  const [message, setMessage] = useState("")
  const [category, setCategory] = useState("billing")
  const [priority, setPriority] = useState("normal")
  const [submitting, setSubmitting] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!subject.trim() || !message.trim()) {
      toast({
        title: "Missing details",
        description: "Please add a subject and message.",
        variant: "destructive",
      })
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch("/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone,
          subject: subject.trim(),
          message: message.trim(),
          category,
          priority,
        }),
      })
      if (!res.ok) throw new Error("Could not submit ticket")
      toast({
        title: "Ticket created",
        description: "We'll respond soon.",
      })
      setSubject("")
      setMessage("")
      setOpen(false)
      onUpdated()
    } catch {
      toast({
        title: "Error",
        description: "Could not submit ticket.",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Card className="py-0">
      <CardHeader className="flex-row items-center justify-between px-5 pt-5">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <LifeBuoy className="size-4 text-primary" />
            My support tickets
          </CardTitle>
          <CardDescription>{tickets.length} total</CardDescription>
        </div>
        <Button size="sm" onClick={() => setOpen((o) => !o)}>
          <Plus className="size-3.5" />
          New ticket
        </Button>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 px-5 pb-5">
        {open && (
          <form
            onSubmit={submit}
            className="flex flex-col gap-3 rounded-lg border bg-muted/30 p-4"
          >
            <div className="flex flex-col gap-2">
              <Label htmlFor="new-ticket-subject">Subject</Label>
              <Input
                id="new-ticket-subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Briefly describe the issue"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="new-ticket-cat">Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger id="new-ticket-cat" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TICKET_CATEGORIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="new-ticket-pri">Priority</Label>
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger id="new-ticket-pri" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TICKET_PRIORITIES.map((p) => (
                      <SelectItem key={p.value} value={p.value}>
                        {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="new-ticket-msg">Message</Label>
              <Textarea
                id="new-ticket-msg"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Describe your issue…"
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={submitting}>
                {submitting ? "Submitting…" : "Submit"}
              </Button>
            </div>
          </form>
        )}

        {tickets.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-4 py-8 text-muted-foreground">
            <LifeBuoy className="size-5" />
            <p className="text-sm">No tickets yet.</p>
          </div>
        ) : (
          <ul className="max-h-[40vh] overflow-y-auto custom-scroll flex flex-col">
            {tickets.map((t: SupportTicket) => (
              <li
                key={t.id}
                className="border-b px-1 py-3 last:border-0"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{t.subject}</p>
                    <p className="line-clamp-2 text-xs text-muted-foreground">
                      {t.message}
                    </p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      <CategoryBadge category={t.category} />
                      <PriorityBadge priority={t.priority} />
                      <TicketStatusBadge status={t.status} />
                      <span className="text-xs text-muted-foreground">
                        {timeAgo(t.createdAt)}
                      </span>
                    </div>
                    {t.adminReply && (
                      <div className="mt-2 rounded-md border border-emerald-500/30 bg-emerald-500/5 px-3 py-2 text-xs">
                        <p className="font-semibold text-emerald-700 dark:text-emerald-300">
                          Support reply:
                        </p>
                        <p className="text-muted-foreground">{t.adminReply}</p>
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard?.writeText(t.id)
                      toast({ title: "Ticket ID copied" })
                    }}
                    className="font-mono text-[10px] text-muted-foreground hover:text-foreground"
                    title="Copy ticket ID"
                  >
                    #{t.id.slice(-6)}
                    <Copy className="ml-1 inline size-3" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
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

/* ============================================================
   LOYALTY CARD
============================================================ */
function tierClasses(tier: string): string {
  switch (tier) {
    case "platinum":
      return "border-transparent bg-gradient-to-r from-emerald-500/20 to-emerald-700/20 text-emerald-700 dark:text-emerald-300"
    case "gold":
      return "border-transparent bg-amber-500/15 text-amber-700 dark:text-amber-300"
    case "silver":
      return "border-transparent bg-slate-500/15 text-slate-700 dark:text-slate-300"
    default:
      return "border-transparent bg-muted text-muted-foreground"
  }
}

function LoyaltyCard({ phone }: { phone: string }) {
  const { toast } = useToast()
  const [summary, setSummary] = useState<LoyaltySummary | null>(null)
  const [packages, setPackages] = useState<WifiPackage[]>([])
  const [loading, setLoading] = useState(true)
  const [redeemOpen, setRedeemOpen] = useState(false)
  const [redeemingId, setRedeemingId] = useState<string | null>(null)
  const [lastVoucher, setLastVoucher] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    try {
      const res = await fetch("/api/loyalty?limit=100")
      if (!res.ok) throw new Error("Failed to load loyalty")
      const data = await res.json()
      const list = (data.loyalty ?? []) as LoyaltySummary[]
      const normalised = normaliseKePhone(phone)
      const me = list.find((m) => normaliseKePhone(m.phone) === normalised) ?? null
      setSummary(me)
    } catch {
      /* ignore */
    } finally {
      setLoading(false)
    }
  }

  async function loadPackages() {
    try {
      const res = await fetch("/api/packages?active=true")
      if (!res.ok) return
      const data = await res.json()
      setPackages(data.packages ?? [])
    } catch {
      /* ignore */
    }
  }

  useEffect(() => {
    load()
    loadPackages()
  }, [phone])

  async function redeem(pkg: WifiPackage) {
    setRedeemingId(pkg.id)
    setLastVoucher(null)
    try {
      const res = await fetch("/api/loyalty/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, packageId: pkg.id }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data.error || "Could not redeem points")
      }
      setLastVoucher(data.voucher?.code ?? null)
      toast({
        title: "Voucher issued 🎉",
        description: `${pkg.name} redeemed successfully.`,
      })
      await load()
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Redeem failed"
      toast({
        title: "Redeem failed",
        description: msg,
        variant: "destructive",
      })
    } finally {
      setRedeemingId(null)
    }
  }

  const tierInfo = summary
    ? pointsToNextTier(summary.lifetimePoints)
    : null

  const redeemOptions: RedeemOption[] = useMemo(() => {
    if (!summary) return []
    return packages.map((p) => {
      const cost = pointsCostForPackage(p.priceKES)
      return {
        packageId: p.id,
        packageName: p.name,
        priceKES: p.priceKES,
        pointsCost: cost,
        affordable: summary.pointsBalance >= cost,
      }
    })
  }, [packages, summary])

  return (
    <Card className="overflow-hidden py-0">
      <div className="bg-gradient-to-r from-primary to-emerald-600 px-5 py-4 text-primary-foreground sm:px-6">
        <div className="flex items-center gap-3">
          <div className="grid size-10 place-items-center rounded-lg bg-white/15">
            <Award className="size-5" />
          </div>
          <div>
            <h3 className="text-base font-bold">Loyalty &amp; Rewards</h3>
            <p className="text-xs text-primary-foreground/90">
              Earn points on every purchase.
            </p>
          </div>
        </div>
      </div>
      <CardContent className="flex flex-col gap-4 px-5 py-5 sm:px-6">
        {loading ? (
          <div className="flex flex-col gap-3">
            <Skeleton className="h-16 w-full rounded-lg" />
            <Skeleton className="h-8 w-full rounded-lg" />
            <Skeleton className="h-20 w-full rounded-lg" />
          </div>
        ) : !summary ? (
          <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed bg-muted/30 px-4 py-8 text-center">
            <Award className="size-6 text-muted-foreground" />
            <p className="text-sm font-medium">No loyalty profile yet</p>
            <p className="text-xs text-muted-foreground">
              Buy a package to start earning points.
            </p>
          </div>
        ) : (
          <>
            {/* Tier + balance */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border bg-muted/30 p-3">
                <p className="text-xs text-muted-foreground">Tier</p>
                <div className="mt-1 flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className={cn("capitalize", tierClasses(summary.tier))}
                  >
                    {tierLabel(summary.tier)}
                  </Badge>
                </div>
              </div>
              <div className="rounded-lg border bg-muted/30 p-3">
                <p className="text-xs text-muted-foreground">Points balance</p>
                <p className="mt-0.5 font-mono text-lg font-bold tabular-nums text-primary">
                  {summary.pointsBalance.toLocaleString("en-KE")}
                </p>
              </div>
            </div>

            {/* Progress to next tier */}
            {tierInfo?.nextTier ? (
              <div className="rounded-lg border p-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <TrendingUp className="size-3" />
                    Progress to{" "}
                    <span className="font-semibold capitalize">
                      {tierInfo.nextTier}
                    </span>
                  </span>
                  <span className="font-mono">
                    {tierInfo.pointsToNextTier.toLocaleString("en-KE")} pts to go
                  </span>
                </div>
                <Progress
                  className="mt-2 h-1.5"
                  value={Math.min(
                    100,
                    Math.max(
                      5,
                      (summary.lifetimePoints /
                        (summary.lifetimePoints +
                          tierInfo.pointsToNextTier)) *
                        100
                    )
                  )}
                />
                <p className="mt-1.5 text-xs text-muted-foreground">
                  Lifetime:{" "}
                  <span className="font-mono">
                    {summary.lifetimePoints.toLocaleString("en-KE")} pts
                  </span>
                </p>
              </div>
            ) : (
              <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3 text-sm">
                <p className="flex items-center gap-1.5 font-medium text-emerald-700 dark:text-emerald-300">
                  <Sparkles className="size-3.5" />
                  You&apos;re at the top tier — Platinum!
                </p>
              </div>
            )}

            {/* Referral code */}
            {summary.referralCode && (
              <div className="flex items-center justify-between rounded-lg border bg-emerald-500/5 p-3">
                <div className="flex items-center gap-2">
                  <Gift className="size-4 text-primary" />
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Your referral code
                    </p>
                    <p className="font-mono text-sm font-semibold">
                      {summary.referralCode}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard?.writeText(summary.referralCode!)
                    toast({ title: "Code copied" })
                  }}
                >
                  <Copy className="size-3.5" />
                  Copy
                </Button>
              </div>
            )}

            <Button
              onClick={() => {
                setLastVoucher(null)
                setRedeemOpen(true)
              }}
              disabled={redeemOptions.length === 0 || summary.pointsBalance < 50}
            >
              <Gift className="size-4" />
              Redeem points
            </Button>
            {summary.pointsBalance < 50 && (
              <p className="text-xs text-muted-foreground">
                You need at least 50 points to redeem a voucher.
              </p>
            )}
          </>
        )}
      </CardContent>

      {/* Redeem dialog */}
      <Dialog open={redeemOpen} onOpenChange={setRedeemOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Gift className="size-4 text-primary" />
              Redeem points for a voucher
            </DialogTitle>
            <DialogDescription>
              Pick a package — points cost is 10× the KES price.
            </DialogDescription>
          </DialogHeader>
          {lastVoucher ? (
            <div className="flex flex-col gap-3 rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-4">
              <div className="flex items-center gap-2">
                <Sparkles className="size-4 text-emerald-600 dark:text-emerald-400" />
                <p className="font-semibold text-emerald-800 dark:text-emerald-200">
                  Voucher issued!
                </p>
              </div>
              <p className="text-xs text-muted-foreground">
                Your free package voucher code:
              </p>
              <p className="rounded-md border bg-card px-3 py-2 text-center font-mono text-lg font-bold tracking-widest">
                {lastVoucher}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => {
                    navigator.clipboard?.writeText(lastVoucher)
                    toast({ title: "Voucher copied" })
                  }}
                >
                  <Copy className="size-3.5" />
                  Copy
                </Button>
                <Button
                  size="sm"
                  className="flex-1"
                  onClick={() => setRedeemOpen(false)}
                >
                  Done
                </Button>
              </div>
            </div>
          ) : (
            <ul className="flex max-h-72 flex-col gap-2 overflow-y-auto custom-scroll">
              {redeemOptions.length === 0 ? (
                <li className="rounded-lg border border-dashed bg-muted/30 px-3 py-6 text-center text-sm text-muted-foreground">
                  No packages available to redeem.
                </li>
              ) : (
                redeemOptions.map((opt) => (
                  <li
                    key={opt.packageId}
                    className={cn(
                      "flex items-center justify-between gap-3 rounded-lg border p-3",
                      opt.affordable
                        ? "border-emerald-500/30 bg-emerald-500/5"
                        : "border-border bg-muted/30 opacity-70"
                    )}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {opt.packageName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatKES(opt.priceKES)} ·{" "}
                        <span className="font-mono">
                          {opt.pointsCost.toLocaleString("en-KE")} pts
                        </span>
                      </p>
                    </div>
                    <Button
                      size="sm"
                      disabled={!opt.affordable || redeemingId === opt.packageId}
                      onClick={() => {
                        const pkg = packages.find((p) => p.id === opt.packageId)
                        if (pkg) redeem(pkg)
                      }}
                    >
                      {redeemingId === opt.packageId ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <Gift className="size-3.5" />
                      )}
                      Redeem
                    </Button>
                  </li>
                ))
              )}
            </ul>
          )}
          {!lastVoucher && (
            <DialogFooter>
              <Button variant="outline" onClick={() => setRedeemOpen(false)}>
                Cancel
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  )
}

/* ============================================================
   REFERRAL CARD
============================================================ */
function ReferralCard({ phone }: { phone: string }) {
  const { toast } = useToast()
  const [summary, setSummary] = useState<LoyaltySummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [code, setCode] = useState("")
  const [applying, setApplying] = useState(false)

  async function load() {
    setLoading(true)
    try {
      const res = await fetch("/api/loyalty?limit=100")
      if (!res.ok) throw new Error("Failed to load")
      const data = await res.json()
      const list = (data.loyalty ?? []) as LoyaltySummary[]
      const normalised = normaliseKePhone(phone)
      setSummary(list.find((m) => normaliseKePhone(m.phone) === normalised) ?? null)
    } catch {
      /* ignore */
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [phone])

  async function apply(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = code.trim().toUpperCase()
    if (!trimmed) {
      toast({
        title: "Enter a code",
        description: "Paste a friend's referral code.",
        variant: "destructive",
      })
      return
    }
    if (summary?.referralCode && trimmed === summary.referralCode) {
      toast({
        title: "Cannot apply your own code",
        description: "Share your code with friends instead!",
        variant: "destructive",
      })
      return
    }
    setApplying(true)
    try {
      const res = await fetch("/api/referrals/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, referralCode: trimmed }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data.error || "Could not apply referral code")
      }
      toast({
        title: "Referral applied 🎉",
        description:
          data.message ||
          "You'll receive bonus points after your first purchase.",
      })
      setCode("")
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Apply failed"
      toast({
        title: "Apply failed",
        description: msg,
        variant: "destructive",
      })
    } finally {
      setApplying(false)
    }
  }

  return (
    <Card className="overflow-hidden py-0">
      <div className="bg-gradient-to-r from-amber-500 to-orange-600 px-5 py-4 text-white sm:px-6">
        <div className="flex items-center gap-3">
          <div className="grid size-10 place-items-center rounded-lg bg-white/15">
            <Share2 className="size-5" />
          </div>
          <div>
            <h3 className="text-base font-bold">Refer &amp; earn</h3>
            <p className="text-xs text-white/90">
              Get 100 bonus points per friend who buys.
            </p>
          </div>
        </div>
      </div>
      <CardContent className="flex flex-col gap-4 px-5 py-5 sm:px-6">
        {loading ? (
          <div className="flex flex-col gap-3">
            <Skeleton className="h-16 w-full rounded-lg" />
            <Skeleton className="h-20 w-full rounded-lg" />
          </div>
        ) : !summary ? (
          <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed bg-muted/30 px-4 py-8 text-center">
            <Share2 className="size-6 text-muted-foreground" />
            <p className="text-sm font-medium">No referral code yet</p>
            <p className="text-xs text-muted-foreground">
              Buy a package to activate your referral code.
            </p>
          </div>
        ) : (
          <>
            {/* Referral code prominent */}
            {summary.referralCode && (
              <div className="flex items-center justify-between rounded-lg border-2 border-dashed border-emerald-500/40 bg-emerald-500/5 p-4">
                <div>
                  <p className="text-xs text-muted-foreground">
                    Share your code
                  </p>
                  <p className="font-mono text-xl font-bold tracking-wide">
                    {summary.referralCode}
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={() => {
                    navigator.clipboard?.writeText(summary.referralCode!)
                    toast({ title: "Referral code copied" })
                  }}
                >
                  <Copy className="size-3.5" />
                  Copy
                </Button>
              </div>
            )}

            {/* Referral stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border bg-muted/30 p-3 text-center">
                <p className="text-xs text-muted-foreground">Referred</p>
                <p className="mt-0.5 font-mono text-lg font-bold tabular-nums">
                  {summary.referralsCount}
                </p>
              </div>
              <div className="rounded-lg border bg-muted/30 p-3 text-center">
                <p className="text-xs text-muted-foreground">Completed</p>
                <p className="mt-0.5 font-mono text-lg font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                  {summary.referralsCompleted}
                </p>
              </div>
            </div>

            <Separator />

            {/* Apply a code */}
            <form onSubmit={apply} className="flex flex-col gap-2">
              <Label htmlFor="ref-apply" className="text-xs">
                Have a friend&apos;s code? Apply it here
              </Label>
              <div className="flex gap-2">
                <Input
                  id="ref-apply"
                  placeholder="e.g. PESA-AB12"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  className="font-mono"
                />
                <Button type="submit" disabled={applying}>
                  {applying ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Send className="size-4" />
                  )}
                  Apply
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Earn bonus points on your first purchase after applying.
              </p>
            </form>
          </>
        )}
      </CardContent>
    </Card>
  )
}
