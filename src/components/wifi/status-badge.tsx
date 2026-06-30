"use client"

import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

type Tone = "green" | "amber" | "muted" | "red"

const toneClass: Record<Tone, string> = {
  green:
    "border-transparent bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  amber:
    "border-transparent bg-amber-500/15 text-amber-700 dark:text-amber-300",
  muted:
    "border-transparent bg-muted text-muted-foreground",
  red:
    "border-transparent bg-destructive/15 text-destructive dark:text-red-300",
}

function toneFor(status: string): Tone {
  const s = status.toLowerCase()
  if (
    s === "active" ||
    s === "unused" ||
    s === "completed" ||
    s === "connected"
  )
    return "green"
  if (s === "pending") return "amber"
  if (s === "failed") return "red"
  // expired, disconnected, used
  return "muted"
}

export function StatusBadge({
  status,
  className,
}: {
  status: string
  className?: string
}) {
  const tone = toneFor(status)
  return (
    <Badge
      variant="outline"
      className={cn("capitalize", toneClass[tone], className)}
    >
      <span
        className={cn(
          "mr-1 inline-block size-1.5 rounded-full",
          tone === "green" && "bg-emerald-500",
          tone === "amber" && "bg-amber-500",
          tone === "red" && "bg-destructive",
          tone === "muted" && "bg-muted-foreground"
        )}
      />
      {status}
    </Badge>
  )
}
