"use client"

import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

/**
 * Priority badge for support tickets.
 * urgent=red, high=amber, normal=primary(green), low=muted
 */
export function PriorityBadge({
  priority,
  className,
}: {
  priority: string
  className?: string
}) {
  const p = priority?.toLowerCase() ?? "normal"
  const tone =
    p === "urgent"
      ? "border-transparent bg-destructive/15 text-destructive dark:text-red-300"
      : p === "high"
      ? "border-transparent bg-amber-500/15 text-amber-700 dark:text-amber-300"
      : p === "low"
      ? "border-transparent bg-muted text-muted-foreground"
      : "border-transparent bg-primary/10 text-primary"
  return (
    <Badge variant="outline" className={cn("capitalize", tone, className)}>
      {p}
    </Badge>
  )
}

const CATEGORY_TONES: Record<string, string> = {
  billing:
    "border-transparent bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  connectivity:
    "border-transparent bg-sky-500/10 text-sky-700 dark:text-sky-300",
  voucher:
    "border-transparent bg-amber-500/10 text-amber-700 dark:text-amber-300",
  account:
    "border-transparent bg-fuchsia-500/10 text-fuchsia-700 dark:text-fuchsia-300",
  other: "border-transparent bg-muted text-muted-foreground",
}

/** Category badge with subtle color tones by category. */
export function CategoryBadge({
  category,
  className,
}: {
  category: string
  className?: string
}) {
  const key = (category ?? "other").toLowerCase()
  const tone = CATEGORY_TONES[key] ?? CATEGORY_TONES.other
  return (
    <Badge variant="outline" className={cn("capitalize", tone, className)}>
      {key}
    </Badge>
  )
}

/** Status badge specifically for support tickets (open/in_progress/resolved/closed). */
export function TicketStatusBadge({
  status,
  className,
}: {
  status: string
  className?: string
}) {
  const s = status?.toLowerCase() ?? "open"
  const tone =
    s === "open"
      ? "border-transparent bg-amber-500/15 text-amber-700 dark:text-amber-300"
      : s === "in_progress"
      ? "border-transparent bg-sky-500/15 text-sky-700 dark:text-sky-300"
      : s === "resolved"
      ? "border-transparent bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
      : s === "closed"
      ? "border-transparent bg-muted text-muted-foreground"
      : "border-transparent bg-muted text-muted-foreground"
  return (
    <Badge
      variant="outline"
      className={cn("capitalize", tone, className)}
    >
      {s.replace("_", " ")}
    </Badge>
  )
}

/** Reseller status badge (active / suspended). */
export function ResellerStatusBadge({
  status,
  className,
}: {
  status: string
  className?: string
}) {
  const s = status?.toLowerCase() ?? "active"
  const tone =
    s === "active"
      ? "border-transparent bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
      : "border-transparent bg-destructive/15 text-destructive dark:text-red-300"
  return (
    <Badge variant="outline" className={cn("capitalize", tone, className)}>
      {s}
    </Badge>
  )
}
