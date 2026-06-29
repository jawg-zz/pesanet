"use client"

import { useEffect, useMemo, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  AlertTriangle,
  CreditCard,
  HelpCircle,
  Info,
  LifeBuoy,
  Loader2,
  Search,
  Send,
  Sparkles,
  Tag,
  Ticket,
  Wifi,
  Wrench,
  X,
  Zap,
} from "lucide-react"
import type { Announcement, WifiPackage, WifiSession } from "@/lib/types"
import {
  PackageCard,
  PackageCardSkeleton,
} from "@/components/wifi/package-card"
import { MpesaModal } from "@/components/wifi/mpesa-modal"
import { VoucherRedeem } from "@/components/wifi/voucher-redeem"
import { ActiveSessionChecker } from "@/components/wifi/active-session-checker"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { ActiveSessionCard } from "@/components/wifi/active-session-card"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { validateKePhone } from "@/lib/wifi-utils"

export function CustomerPortal() {
  const [packages, setPackages] = useState<WifiPackage[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<WifiPackage | null>(null)
  const [open, setOpen] = useState(false)
  const [activeSession, setActiveSession] = useState<WifiSession | null>(null)
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())

  useEffect(() => {
    let active = true
    fetch("/api/packages?active=true")
      .then((r) => r.json())
      .then((d) => {
        if (active) {
          setPackages(d.packages ?? [])
          setLoading(false)
        }
      })
      .catch(() => {
        if (active) setLoading(false)
      })
    // Fetch active announcements for the banner.
    fetch("/api/announcements")
      .then((r) => r.json())
      .then((d) => {
        if (active) setAnnouncements(d.announcements ?? [])
      })
      .catch(() => {
        /* ignore — banner is non-critical */
      })
    return () => {
      active = false
    }
  }, [])

  const visibleAnnouncements = useMemo(
    () => announcements.filter((a) => !dismissed.has(a.id)),
    [announcements, dismissed]
  )

  function dismiss(id: string) {
    setDismissed((s) => {
      const next = new Set(s)
      next.add(id)
      return next
    })
  }

  function buy(pkg: WifiPackage) {
    setSelected(pkg)
    setOpen(true)
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
      {/* Announcements banner */}
      <AnnouncementBanner items={visibleAnnouncements} onDismiss={dismiss} />

      {/* Hero */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-emerald-600 to-emerald-700 px-6 py-10 text-primary-foreground shadow-lg sm:px-10 sm:py-14">
        <div className="absolute -right-12 -top-12 size-64 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute -bottom-16 -left-12 size-72 rounded-full bg-emerald-900/30 blur-2xl" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-xl">
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-medium backdrop-blur"
            >
              <Sparkles className="size-3.5" />
              Prepaid WiFi · M-Pesa ready
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl md:text-5xl"
            >
              Fast, affordable WiFi — pay with M-Pesa.
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="mt-3 max-w-lg text-sm text-primary-foreground/90 sm:text-base"
            >
              Buy a package in seconds with Safaricom M-Pesa, or redeem a voucher
              code. Manage your session and stay connected across Kenya.
            </motion.p>
            <div className="mt-5 flex flex-wrap items-center gap-3 text-xs text-primary-foreground/90">
              <span className="flex items-center gap-1.5 rounded-md bg-white/15 px-2.5 py-1 backdrop-blur">
                <Zap className="size-3.5" /> Instant activation
              </span>
              <span className="flex items-center gap-1.5 rounded-md bg-white/15 px-2.5 py-1 backdrop-blur">
                <CreditCard className="size-3.5" /> M-Pesa STK push
              </span>
              <span className="flex items-center gap-1.5 rounded-md bg-white/15 px-2.5 py-1 backdrop-blur">
                <Ticket className="size-3.5" /> Voucher support
              </span>
            </div>
          </div>

          {/* Quick check */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="w-full max-w-md"
          >
            <ActiveSessionChecker onSessionChange={setActiveSession} />
          </motion.div>
        </div>
      </section>

      {/* Active session inline */}
      {activeSession && (
        <section className="mt-6">
          <ActiveSessionInline
            session={activeSession}
            onExtended={(s) => setActiveSession(s)}
          />
        </section>
      )}

      {/* How it works */}
      <section className="mt-10">
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            {
              icon: <Search className="size-5" />,
              title: "1. Choose package",
              desc: "Pick a plan that fits your needs and budget.",
            },
            {
              icon: <CreditCard className="size-5" />,
              title: "2. Pay with M-Pesa",
              desc: "Approve the STK push on your phone — secure & instant.",
            },
            {
              icon: <Wifi className="size-5" />,
              title: "3. Get connected",
              desc: "Your session starts immediately. Track time and data.",
            },
          ].map((s, i) => (
            <motion.div
              key={s.title}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
              className="rounded-xl border bg-card p-5"
            >
              <div className="mb-3 grid size-10 place-items-center rounded-lg bg-primary/10 text-primary">
                {s.icon}
              </div>
              <h3 className="font-semibold">{s.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{s.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Packages grid */}
      <section className="mt-10">
        <div className="mb-5 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">
              Internet packages
            </h2>
            <p className="text-sm text-muted-foreground">
              Pick a plan and pay instantly with M-Pesa.
            </p>
          </div>
          {!loading && packages.length > 0 && (
            <span className="text-xs text-muted-foreground">
              {packages.length} active package{packages.length === 1 ? "" : "s"}
            </span>
          )}
        </div>

        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <PackageCardSkeleton key={i} />
            ))}
          </div>
        ) : packages.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed bg-muted/30 px-4 py-12 text-center">
            <Wifi className="size-6 text-muted-foreground" />
            <p className="text-sm font-medium">No packages available</p>
            <p className="text-xs text-muted-foreground">
              Please check back later.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {packages.map((p, i) => (
              <PackageCard key={p.id} pkg={p} onBuy={buy} index={i} />
            ))}
          </div>
        )}
      </section>

      {/* Voucher redeem + FAQ */}
      <section className="mt-10 grid gap-6 lg:grid-cols-2">
        <VoucherRedeem />

        <div className="rounded-xl border bg-card p-5">
          <div className="mb-3 flex items-center gap-2">
            <HelpCircle className="size-4 text-primary" />
            <h3 className="font-semibold">Frequently asked questions</h3>
          </div>
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="q1">
              <AccordionTrigger className="text-sm">
                How do I pay for WiFi?
              </AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground">
                Choose a package, click <strong>Buy with M-Pesa</strong>, enter
                your phone number, and approve the STK push prompt on your phone.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="q2">
              <AccordionTrigger className="text-sm">
                Can I use a voucher instead?
              </AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground">
                Yes. Enter your voucher code and phone number in the redeem form,
                and your session will start immediately.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="q3">
              <AccordionTrigger className="text-sm">
                What if my session disconnects?
              </AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground">
                Use the <em>Check my session</em> tool in the hero to see your
                current session, time remaining, and disconnect manually if
                needed.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="q4">
              <AccordionTrigger className="text-sm">
                Which networks are supported?
              </AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground">
                PesaNet accepts Kenyan Safaricom numbers (07XX, 01XX, or
                +2547XX) for M-Pesa payments.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </section>

      {/* Support / Need help? */}
      <section className="mt-10">
        <SupportCard />
      </section>

      <MpesaModal
        pkg={selected}
        open={open}
        onOpenChange={setOpen}
        onSuccess={(s) => setActiveSession(s)}
      />
    </div>
  )
}

function ActiveSessionInline({
  session,
  onExtended,
}: {
  session: WifiSession
  onExtended?: (s: WifiSession) => void
}) {
  return <ActiveSessionCard session={session} onExtended={onExtended} />
}

function announcementTone(type: string) {
  switch (type) {
    case "warning":
      return {
        wrap: "border-amber-300/60 bg-amber-50 text-amber-900 dark:border-amber-700/40 dark:bg-amber-950/40 dark:text-amber-100",
        iconWrap: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
        Icon: AlertTriangle,
      }
    case "maintenance":
      return {
        wrap: "border-orange-300/60 bg-orange-50 text-orange-900 dark:border-orange-700/40 dark:bg-orange-950/40 dark:text-orange-100",
        iconWrap: "bg-orange-500/15 text-orange-700 dark:text-orange-300",
        Icon: Wrench,
      }
    case "promo":
      return {
        wrap: "border-emerald-300/60 bg-emerald-50 text-emerald-900 dark:border-emerald-700/40 dark:bg-emerald-950/40 dark:text-emerald-100",
        iconWrap: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
        Icon: Tag,
      }
    default:
      return {
        wrap: "border-slate-300/60 bg-slate-50 text-slate-900 dark:border-slate-700/40 dark:bg-slate-900/40 dark:text-slate-100",
        iconWrap: "bg-slate-500/15 text-slate-700 dark:text-slate-300",
        Icon: Info,
      }
  }
}

function AnnouncementBanner({
  items,
  onDismiss,
}: {
  items: Announcement[]
  onDismiss: (id: string) => void
}) {
  if (items.length === 0) return null
  return (
    <div className="mb-5 flex flex-col gap-2">
      <AnimatePresence initial={false}>
        {items.map((a) => {
          const tone = announcementTone(a.type)
          const Icon = tone.Icon
          return (
            <motion.div
              key={a.id}
              initial={{ opacity: 0, y: -8, height: 0 }}
              animate={{ opacity: 1, y: 0, height: "auto" }}
              exit={{ opacity: 0, y: -8, height: 0 }}
              transition={{ duration: 0.2 }}
              className={`flex items-start gap-3 rounded-xl border px-4 py-3 shadow-sm ${tone.wrap}`}
              role="status"
            >
              <span
                className={`grid size-7 shrink-0 place-items-center rounded-md ${tone.iconWrap}`}
              >
                <Icon className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold leading-tight">
                  {a.title}
                </p>
                <p className="mt-0.5 text-xs leading-relaxed opacity-90">
                  {a.message}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onDismiss(a.id)}
                aria-label={`Dismiss announcement: ${a.title}`}
                className="shrink-0 rounded-md p-1 opacity-60 transition hover:bg-black/5 hover:opacity-100 dark:hover:bg-white/10"
              >
                <X className="size-3.5" />
              </button>
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}

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

function SupportCard() {
  const { toast } = useToast()
  const [phone, setPhone] = useState("")
  const [name, setName] = useState("")
  const [subject, setSubject] = useState("")
  const [message, setMessage] = useState("")
  const [category, setCategory] = useState("billing")
  const [priority, setPriority] = useState("normal")
  const [submitting, setSubmitting] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!validateKePhone(phone)) {
      toast({
        title: "Invalid phone",
        description: "Enter a valid Kenyan number (07XXXXXXXX or 01XXXXXXXX).",
        variant: "destructive",
      })
      return
    }
    if (!subject.trim() || !message.trim()) {
      toast({
        title: "Missing details",
        description: "Please provide a subject and message.",
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
          phone: phone.trim(),
          customerName: name.trim() || undefined,
          subject: subject.trim(),
          message: message.trim(),
          category,
          priority,
        }),
      })
      const data = await res.json()
      if (!res.ok || data.error) {
        throw new Error(data.error || data.message || "Could not submit ticket")
      }
      toast({
        title: "Ticket submitted 🎉",
        description: "Our support team will get back to you shortly.",
      })
      setSubject("")
      setMessage("")
      setName("")
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not submit ticket"
      toast({
        title: "Submission failed",
        description: msg,
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Card className="overflow-hidden py-0">
      <div className="bg-gradient-to-r from-primary to-emerald-600 px-5 py-4 text-primary-foreground sm:px-6">
        <div className="flex items-center gap-3">
          <div className="grid size-10 place-items-center rounded-lg bg-white/15">
            <LifeBuoy className="size-5" />
          </div>
          <div>
            <h3 className="text-base font-bold">Need help? Get support</h3>
            <p className="text-xs text-primary-foreground/90">
              Submit a ticket and our team will respond as soon as possible.
            </p>
          </div>
        </div>
      </div>
      <CardContent className="px-5 py-5 sm:px-6">
        <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="ticket-phone">Phone number *</Label>
            <Input
              id="ticket-phone"
              inputMode="tel"
              placeholder="07XX XXX XXX"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="ticket-name">Your name (optional)</Label>
            <Input
              id="ticket-name"
              placeholder="John Doe"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2 sm:col-span-2">
            <Label htmlFor="ticket-subject">Subject *</Label>
            <Input
              id="ticket-subject"
              placeholder="Briefly describe the issue"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="ticket-cat">Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger id="ticket-cat" className="w-full">
                <SelectValue placeholder="Select category" />
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
            <Label htmlFor="ticket-pri">Priority</Label>
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger id="ticket-pri" className="w-full">
                <SelectValue placeholder="Select priority" />
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
          <div className="flex flex-col gap-2 sm:col-span-2">
            <Label htmlFor="ticket-msg">Message *</Label>
            <Textarea
              id="ticket-msg"
              placeholder="Describe your issue in detail…"
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </div>
          <div className="sm:col-span-2">
            <Button type="submit" disabled={submitting} className="w-full sm:w-auto">
              {submitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Submitting…
                </>
              ) : (
                <>
                  <Send className="size-4" />
                  Submit ticket
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
