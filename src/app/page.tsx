"use client"

import { AnimatePresence, motion } from "framer-motion"
import { Wifi, ShieldCheck, Smartphone, Globe } from "lucide-react"
import { useAppStore } from "@/lib/store"
import { CustomerPortal } from "@/components/wifi/customer-portal"
import { AdminDashboard } from "@/components/wifi/admin-dashboard"
import { cn } from "@/lib/utils"

export default function Home() {
  const view = useAppStore((s) => s.view)
  const setView = useAppStore((s) => s.setView)

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-xl bg-primary text-primary-foreground shadow-sm">
              <Wifi className="size-5" />
            </div>
            <div className="flex flex-col leading-tight">
              <span className="flex items-center gap-2 text-lg font-bold tracking-tight">
                PesaNet
                <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                  Kenya
                </span>
              </span>
              <span className="hidden text-xs text-muted-foreground sm:block">
                Prepaid WiFi billing
              </span>
            </div>
          </div>

          {/* View toggle */}
          <nav
            aria-label="Switch view"
            className="flex items-center rounded-full border bg-muted/60 p-1"
          >
            <button
              type="button"
              onClick={() => setView("customer")}
              className={cn(
                "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all sm:px-4 sm:text-sm",
                view === "customer"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
              aria-pressed={view === "customer"}
            >
              <Smartphone className="size-4" />
              <span className="hidden sm:inline">Customer Portal</span>
              <span className="sm:hidden">Customer</span>
            </button>
            <button
              type="button"
              onClick={() => setView("admin")}
              className={cn(
                "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all sm:px-4 sm:text-sm",
                view === "admin"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
              aria-pressed={view === "admin"}
            >
              <ShieldCheck className="size-4" />
              <span className="hidden sm:inline">Admin Dashboard</span>
              <span className="sm:hidden">Admin</span>
            </button>
          </nav>
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
            {view === "customer" ? <CustomerPortal /> : <AdminDashboard />}
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
