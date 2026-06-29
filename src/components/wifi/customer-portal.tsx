"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import {
  CreditCard,
  HelpCircle,
  Search,
  Sparkles,
  Ticket,
  Wifi,
  Zap,
} from "lucide-react"
import type { WifiPackage, WifiSession } from "@/lib/types"
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

export function CustomerPortal() {
  const [packages, setPackages] = useState<WifiPackage[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<WifiPackage | null>(null)
  const [open, setOpen] = useState(false)
  const [activeSession, setActiveSession] = useState<WifiSession | null>(null)

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
    return () => {
      active = false
    }
  }, [])

  function buy(pkg: WifiPackage) {
    setSelected(pkg)
    setOpen(true)
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
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
          <ActiveSessionInline session={activeSession} />
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

      <MpesaModal
        pkg={selected}
        open={open}
        onOpenChange={setOpen}
        onSuccess={(s) => setActiveSession(s)}
      />
    </div>
  )
}

function ActiveSessionInline({ session }: { session: WifiSession }) {
  return <ActiveSessionCard session={session} />
}
