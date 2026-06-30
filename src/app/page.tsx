"use client"

import { AnimatePresence, motion } from "framer-motion"
import {
  Globe,
  Moon,
  ShieldCheck,
  Smartphone,
  Store,
  Sun,
  UserCircle,
  Wifi,
} from "lucide-react"
import { useTheme } from "next-themes"
import { useAppStore } from "@/lib/store"
import { CustomerPortal } from "@/components/wifi/customer-portal"
import { CustomerAccount } from "@/components/wifi/customer-account"
import { ResellerPortal } from "@/components/wifi/reseller-portal"
import { AdminDashboard } from "@/components/wifi/admin-dashboard"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const VIEWS = [
  { id: "customer", label: "Customer Portal", short: "Customer", icon: Smartphone },
  { id: "account", label: "My Account", short: "Account", icon: UserCircle },
  { id: "reseller", label: "Reseller", short: "Reseller", icon: Store },
  { id: "admin", label: "Admin Dashboard", short: "Admin", icon: ShieldCheck },
] as const

function ThemeToggle() {
  const { setTheme, resolvedTheme } = useTheme()
  // Icons are toggled purely via CSS (dark: variant) so there is no
  // hydration mismatch and no need for a mounted flag.
  const toggle = () => setTheme(resolvedTheme === "dark" ? "light" : "dark")
  return (
    <Button
      variant="outline"
      size="icon"
      onClick={toggle}
      aria-label="Toggle dark mode"
      title="Toggle dark mode"
      className="relative h-9 w-9"
    >
      <Sun className="size-4 hidden dark:block" />
      <Moon className="size-4 block dark:hidden" />
    </Button>
  )
}

export default function Home() {
  const view = useAppStore((s) => s.view)
  const setView = useAppStore((s) => s.setView)

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-2 px-3 sm:gap-3 sm:px-6">
          {/* Logo */}
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground shadow-sm">
              <Wifi className="size-5" />
            </div>
            <div className="hidden flex-col leading-tight sm:flex">
              <span className="flex items-center gap-2 text-lg font-bold tracking-tight">
                PesaNet
                <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                  Kenya
                </span>
              </span>
              <span className="text-xs text-muted-foreground">
                Prepaid WiFi billing
              </span>
            </div>
          </div>

          {/* View switcher (desktop) */}
          <nav
            aria-label="Switch view"
            className="hidden items-center gap-1 rounded-full border bg-muted/60 p-1 md:flex"
          >
            {VIEWS.map((v) => {
              const Icon = v.icon
              const active = view === v.id
              return (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setView(v.id)}
                  className={cn(
                    "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all lg:px-4 lg:text-sm",
                    active
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                  aria-pressed={active}
                >
                  <Icon className="size-4" />
                  <span>{v.label}</span>
                </button>
              )
            })}
          </nav>

          {/* Right side: dark mode toggle (mobile shows compact view switch) */}
          <div className="flex items-center gap-2">
            {/* Compact view switcher (mobile) */}
            <div className="flex items-center gap-1 rounded-full border bg-muted/60 p-1 md:hidden">
              {VIEWS.map((v) => {
                const Icon = v.icon
                const active = view === v.id
                return (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => setView(v.id)}
                    className={cn(
                      "grid size-7 place-items-center rounded-full transition-all",
                      active
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                    aria-pressed={active}
                    aria-label={v.label}
                    title={v.label}
                  >
                    <Icon className="size-4" />
                  </button>
                )
              })}
            </div>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1">
        <AnimatePresence mode="wait">
          <motion.div
            key={view}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
          >
            {view === "customer" && <CustomerPortal />}
            {view === "account" && <CustomerAccount />}
            {view === "reseller" && <ResellerPortal />}
            {view === "admin" && <AdminDashboard />}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Sticky footer */}
      <footer className="mt-auto border-t bg-background/80">
        <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6">
          <div className="flex flex-col items-start justify-between gap-3 text-sm text-muted-foreground sm:flex-row sm:items-center">
            <div className="flex items-center gap-2">
              <Globe className="size-4 text-primary" />
              <span>
                PesaNet — WiFi billing built for Kenya{" "}
                <span aria-hidden>🇰🇪</span>
              </span>
            </div>
            <div className="flex flex-col items-start gap-1 sm:flex-row sm:items-center sm:gap-3">
              <span className="rounded-md bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-300">
                M-Pesa ready
              </span>
              <span className="text-xs">
                Powered by Safaricom-style payments
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
