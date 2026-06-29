"use client"

import { useEffect, useMemo, useState } from "react"
import { motion } from "framer-motion"
import {
  Loader2,
  MessageSquare,
  Package as PackageIcon,
  RefreshCw,
  Smartphone,
  Star,
  Trash2,
} from "lucide-react"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import type { Feedback } from "@/lib/types"
import { cn } from "@/lib/utils"
import { timeAgo } from "@/lib/wifi-utils"
import { useToast } from "@/hooks/use-toast"

function Stars({
  rating,
  size = "size-4",
}: {
  rating: number
  size?: string
}) {
  return (
    <div className="flex items-center gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={cn(
            size,
            i < rating
              ? "fill-amber-400 text-amber-400"
              : "fill-transparent text-muted-foreground/40"
          )}
        />
      ))}
    </div>
  )
}

export function FeedbackManager() {
  const { toast } = useToast()
  const [feedback, setFeedback] = useState<Feedback[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>("all")
  const [deleteTarget, setDeleteTarget] = useState<Feedback | null>(null)
  const [deleting, setDeleting] = useState(false)

  async function load() {
    setLoading(true)
    try {
      const res = await fetch("/api/feedback")
      if (!res.ok) throw new Error("Failed to load")
      const data = (await res.json()) as { feedback: Feedback[] }
      setFeedback(data.feedback ?? [])
    } catch {
      toast({
        title: "Error",
        description: "Could not load customer feedback.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  async function confirmDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/feedback/${deleteTarget.id}`, {
        method: "DELETE",
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || "Could not delete")
      toast({
        title: "Feedback deleted",
        description: `Removed ${deleteTarget.rating}-star review.`,
      })
      setDeleteTarget(null)
      load()
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not delete"
      toast({
        title: "Error",
        description: msg,
        variant: "destructive",
      })
    } finally {
      setDeleting(false)
    }
  }

  const stats = useMemo(() => {
    const total = feedback.length
    const sum = feedback.reduce((s, f) => s + f.rating, 0)
    const avg = total > 0 ? sum / total : 0
    const dist: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    for (const f of feedback) {
      if (f.rating >= 1 && f.rating <= 5) dist[f.rating] += 1
    }
    return { total, avg, dist }
  }, [feedback])

  const filtered = useMemo(() => {
    if (filter === "all") return feedback
    const r = Number(filter)
    return feedback.filter((f) => f.rating === r)
  }, [feedback, filter])

  return (
    <div className="flex flex-col gap-5">
      {/* Summary */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="py-0">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="grid size-14 place-items-center rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-300">
              <Star className="size-7 fill-amber-400 text-amber-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Average rating</p>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold tabular-nums">
                  {stats.avg.toFixed(1)}
                </span>
                <span className="text-xs text-muted-foreground">/ 5</span>
              </div>
              <Stars rating={Math.round(stats.avg)} size="size-3.5" />
            </div>
          </CardContent>
        </Card>

        <Card className="py-0 lg:col-span-2">
          <CardContent className="p-5">
            <div className="mb-3 flex items-center justify-between">
              <p className="flex items-center gap-2 text-sm font-medium">
                <MessageSquare className="size-4 text-primary" />
                Rating distribution
              </p>
              <span className="text-xs text-muted-foreground">
                {stats.total} review{stats.total === 1 ? "" : "s"}
              </span>
            </div>
            <div className="flex flex-col gap-2">
              {[5, 4, 3, 2, 1].map((star) => {
                const count = stats.dist[star] ?? 0
                const pct =
                  stats.total > 0 ? Math.round((count / stats.total) * 100) : 0
                return (
                  <button
                    key={star}
                    type="button"
                    onClick={() =>
                      setFilter(filter === String(star) ? "all" : String(star))
                    }
                    className={cn(
                      "group flex items-center gap-3 rounded-md px-2 py-1 text-left transition hover:bg-muted/50",
                      filter === String(star) && "bg-muted/60"
                    )}
                  >
                    <span className="flex w-12 items-center gap-1 text-xs font-medium">
                      {star}
                      <Star className="size-3 fill-amber-400 text-amber-400" />
                    </span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-amber-400 transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="w-16 text-right text-xs tabular-nums text-muted-foreground">
                      {count} · {pct}%
                    </span>
                  </button>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="py-0">
        <CardHeader className="flex-col gap-3 px-5 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Star className="size-4 text-primary" />
              Customer Feedback
              <span className="text-sm font-normal text-muted-foreground">
                ({filtered.length})
              </span>
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Post-session ratings &amp; comments from customers.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Tabs value={filter} onValueChange={setFilter}>
              <TabsList className="h-9">
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="5">5★</TabsTrigger>
                <TabsTrigger value="4">4★</TabsTrigger>
                <TabsTrigger value="3">3★</TabsTrigger>
                <TabsTrigger value="2">2★</TabsTrigger>
                <TabsTrigger value="1">1★</TabsTrigger>
              </TabsList>
            </Tabs>
            <Button variant="outline" size="icon" onClick={load} aria-label="Refresh">
              <RefreshCw className="size-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="px-5 pb-5">
          {loading ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-36 rounded-xl" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed bg-muted/30 px-4 py-12 text-center">
              <Star className="size-6 text-muted-foreground" />
              <p className="text-sm font-medium">No feedback yet</p>
              <p className="text-xs text-muted-foreground">
                Ratings submitted by customers after their session will appear
                here.
              </p>
            </div>
          ) : (
            <div className="grid max-h-[60vh] gap-3 overflow-y-auto custom-scroll sm:grid-cols-2">
              {filtered.map((f, i) => (
                <motion.div
                  key={f.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i * 0.03, 0.2) }}
                >
                  <Card className="h-full py-0">
                    <CardContent className="flex flex-col gap-3 p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex flex-col gap-1">
                          <Stars rating={f.rating} size="size-4" />
                          <span className="text-xs text-muted-foreground">
                            {timeAgo(f.createdAt)}
                          </span>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setDeleteTarget(f)}
                          aria-label="Delete feedback"
                        >
                          <Trash2 className="size-3.5 text-destructive" />
                        </Button>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <Badge
                          variant="outline"
                          className="border-transparent bg-muted text-muted-foreground"
                        >
                          <Smartphone className="mr-1 size-3" />
                          <span className="font-mono">{f.phone}</span>
                        </Badge>
                        {f.packageName && (
                          <Badge
                            variant="outline"
                            className="border-transparent bg-primary/10 text-primary"
                          >
                            <PackageIcon className="mr-1 size-3" />
                            {f.packageName}
                          </Badge>
                        )}
                      </div>
                      {f.comment && f.comment.trim() ? (
                        <p className="rounded-md border bg-muted/30 px-3 py-2 text-sm italic text-foreground/80">
                          “{f.comment.trim()}”
                        </p>
                      ) : (
                        <p className="rounded-md border border-dashed bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
                          No comment left.
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete confirm */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete feedback?</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogDescription>
            This will permanently delete the {deleteTarget?.rating}-star review
            from <span className="font-mono">{deleteTarget?.phone}</span>.
          </AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={deleting}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {deleting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Deleting…
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
