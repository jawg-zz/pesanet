"use client"

import { useState } from "react"
import {
  LayoutDashboard,
  LogOut,
  Menu,
  Package as PackageIcon,
  Receipt,
  Smartphone,
  Ticket,
  Users,
  Wifi,
} from "lucide-react"
import { useAppStore, type AdminSection } from "@/lib/store"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import { AdminLogin } from "@/components/wifi/admin/admin-login"
import { AdminOverview } from "@/components/wifi/admin/overview"
import { SessionsManager } from "@/components/wifi/admin/sessions-manager"
import { PackagesManager } from "@/components/wifi/admin/packages-manager"
import { VouchersManager } from "@/components/wifi/admin/vouchers-manager"
import { TransactionsManager } from "@/components/wifi/admin/transactions-manager"
import { CustomersManager } from "@/components/wifi/admin/customers-manager"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"

const NAV: { id: AdminSection; label: string; icon: React.ReactNode }[] = [
  { id: "overview", label: "Overview", icon: <LayoutDashboard className="size-4" /> },
  { id: "sessions", label: "Sessions", icon: <Wifi className="size-4" /> },
  { id: "packages", label: "Packages", icon: <PackageIcon className="size-4" /> },
  { id: "vouchers", label: "Vouchers", icon: <Ticket className="size-4" /> },
  { id: "transactions", label: "Transactions", icon: <Receipt className="size-4" /> },
  { id: "customers", label: "Customers", icon: <Users className="size-4" /> },
]

export function AdminDashboard() {
  const adminAuthed = useAppStore((s) => s.adminAuthed)
  const adminName = useAppStore((s) => s.adminName)
  const adminSection = useAppStore((s) => s.adminSection)
  const setAdminSection = useAppStore((s) => s.setAdminSection)
  const setAdminAuthed = useAppStore((s) => s.setAdminAuthed)
  const [mobileOpen, setMobileOpen] = useState(false)

  if (!adminAuthed) return <AdminLogin />

  function renderSection() {
    switch (adminSection) {
      case "overview":
        return <AdminOverview />
      case "sessions":
        return <SessionsManager />
      case "packages":
        return <PackagesManager />
      case "vouchers":
        return <VouchersManager />
      case "transactions":
        return <TransactionsManager />
      case "customers":
        return <CustomersManager />
      default:
        return <AdminOverview />
    }
  }

  const SidebarContent = (
    <nav className="flex flex-col gap-1">
      {NAV.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => {
            setAdminSection(item.id)
            setMobileOpen(false)
          }}
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
            adminSection === item.id
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          )}
          aria-current={adminSection === item.id ? "page" : undefined}
        >
          {item.icon}
          {item.label}
        </button>
      ))}
    </nav>
  )

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6">
      {/* Top bar */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="lg:hidden">
                <Menu className="size-4" />
                <span className="sr-only">Open navigation</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72">
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <Wifi className="size-4 text-primary" />
                  PesaNet Admin
                </SheetTitle>
              </SheetHeader>
              <Separator className="my-2" />
              <div className="px-2">{SidebarContent}</div>
            </SheetContent>
          </Sheet>

          <div>
            <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
              {NAV.find((n) => n.id === adminSection)?.label ?? "Dashboard"}
            </h1>
            <p className="text-xs text-muted-foreground sm:text-sm">
              Welcome, {adminName ?? "admin"} — manage your WiFi network.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden items-center gap-2 rounded-full border bg-muted/40 px-3 py-1.5 text-xs sm:flex">
            <Smartphone className="size-3.5 text-primary" />
            <span className="text-muted-foreground">Signed in as</span>
            <span className="font-semibold">{adminName ?? "admin"}</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setAdminAuthed(false)
              setAdminSection("overview")
            }}
          >
            <LogOut className="size-4" />
            <span className="hidden sm:inline">Logout</span>
          </Button>
        </div>
      </div>

      {/* Layout */}
      <div className="flex gap-6">
        <aside className="hidden w-60 shrink-0 lg:block">
          <div className="sticky top-24">
            <Card className="bg-card/60 backdrop-blur">
              <div className="p-3">
                <div className="mb-2 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Navigation
                </div>
                {SidebarContent}
              </div>
            </Card>
          </div>
        </aside>

        <section className="min-w-0 flex-1">{renderSection()}</section>
      </div>
    </div>
  )
}
