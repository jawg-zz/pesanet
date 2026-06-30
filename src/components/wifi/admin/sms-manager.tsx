"use client"

import { useEffect, useMemo, useState } from "react"
import { motion } from "framer-motion"
import {
  Eye,
  Loader2,
  MessageSquare,
  RefreshCw,
  Send,
  Smartphone,
  Users,
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
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { HotspotSite, SmsBroadcast, WifiPackage } from "@/lib/types"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { timeAgo } from "@/lib/wifi-utils"

const AUDIENCES = [
  { value: "all", label: "All customers" },
  { value: "active", label: "Active sessions" },
  { value: "by_site", label: "By site" },
  { value: "by_package", label: "By package" },
]

const MAX_LEN = 160

function audienceLabel(audience: string, filter?: string): string {
  switch (audience) {
    case "all":
      return "All customers"
    case "active":
      return "Active sessions"
    case "by_site":
      return filter ? `Site: ${filter}` : "By site"
    case "by_package":
      return filter ? `Package: ${filter}` : "By package"
    default:
      return audience
  }
}

export function SmsManager() {
  const { toast } = useToast()
  const [message, setMessage] = useState("")
  const [audience, setAudience] = useState("all")
  const [audienceFilter, setAudienceFilter] = useState<string>("")
  const [sites, setSites] = useState<HotspotSite[]>([])
  const [packages, setPackages] = useState<WifiPackage[]>([])
  const [broadcasts, setBroadcasts] = useState<SmsBroadcast[]>([])
  const [loadingList, setLoadingList] = useState(true)
  const [previewing, setPreviewing] = useState(false)
  const [sending, setSending] = useState(false)
  const [preview, setPreview] = useState<{
    recipientCount: number
    sample: string[]
  } | null>(null)

  async function loadBroadcasts() {
    setLoadingList(true)
    try {
      const res = await fetch("/api/sms")
      if (!res.ok) throw new Error("Failed to load")
      const data = await res.json()
      setBroadcasts((data.broadcasts ?? []) as SmsBroadcast[])
    } catch {
      /* ignore */
    } finally {
      setLoadingList(false)
    }
  }

  async function loadMeta() {
    try {
      const [s, p] = await Promise.all([
        fetch("/api/sites").then((r) => r.json() as Promise<{ sites: HotspotSite[] }>),
        fetch("/api/packages?active=true").then(
          (r) => r.json() as Promise<{ packages: WifiPackage[] }>
        ),
      ])
      setSites(s.sites ?? [])
      setPackages(p.packages ?? [])
    } catch {
      /* ignore */
    }
  }

  useEffect(() => {
    loadBroadcasts()
    loadMeta()
  }, [])

  // Reset the filter whenever the audience kind changes.
  useEffect(() => {
    setAudienceFilter("")
    setPreview(null)
  }, [audience])

  const body = useMemo(
    () => ({
      message: message.trim(),
      audience,
      audienceFilter: audienceFilter || undefined,
    }),
    [message, audience, audienceFilter]
  )

  async function previewAudience() {
    setPreviewing(true)
    setPreview(null)
    try {
      const res = await fetch("/api/sms/audience-preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          audience,
          audienceFilter: audienceFilter || undefined,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data.error || "Could not preview audience")
      }
      setPreview({
        recipientCount: data.recipientCount ?? 0,
        sample: (data.sample ?? []) as string[],
      })
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Preview failed"
      toast({
        title: "Preview failed",
        description: msg,
        variant: "destructive",
      })
    } finally {
      setPreviewing(false)
    }
  }

  async function send() {
    if (!body.message) {
      toast({
        title: "Message required",
        description: "Type a message before sending.",
        variant: "destructive",
      })
      return
    }
    if (body.message.length > MAX_LEN) {
      toast({
        title: "Too long",
        description: `Message must be ≤ ${MAX_LEN} characters.`,
        variant: "destructive",
      })
      return
    }
    setSending(true)
    try {
      const res = await fetch("/api/sms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data.error || "Could not send broadcast")
      }
      toast({
        title: "Broadcast sent 🎉",
        description: `Delivered to ${data.recipientCount ?? 0} recipients.`,
      })
      setMessage("")
      setPreview(null)
      await loadBroadcasts()
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Send failed"
      toast({
        title: "Send failed",
        description: msg,
        variant: "destructive",
      })
    } finally {
      setSending(false)
    }
  }

  const remaining = MAX_LEN - message.length
  const overLimit = remaining < 0

  return (
    <div className="flex flex-col gap-5">
      {/* Summary */}
      <div className="grid gap-4 sm:grid-cols-3">
        <SummaryCard
          icon={<MessageSquare className="size-4" />}
          label="Total broadcasts"
          value={broadcasts.length.toString()}
          tone="primary"
        />
        <SummaryCard
          icon={<Users className="size-4" />}
          label="Recipients reached"
          value={broadcasts
            .reduce((s, b) => s + (b.recipientCount ?? 0), 0)
            .toLocaleString("en-KE")}
          tone="emerald"
        />
        <SummaryCard
          icon={<Send className="size-4" />}
          label="Last broadcast"
          value={
            broadcasts.length > 0 ? timeAgo(broadcasts[0].createdAt) : "—"
          }
          tone="amber"
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Composer */}
        <Card className="py-0">
          <CardHeader className="px-5 pt-5">
            <CardTitle className="flex items-center gap-2 text-base">
              <Send className="size-4 text-primary" />
              Compose broadcast
            </CardTitle>
            <CardDescription>
              Send a bulk SMS to a customer segment.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 px-5 pb-5">
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="sms-msg">Message</Label>
                <span
                  className={cn(
                    "font-mono text-xs",
                    overLimit
                      ? "text-destructive"
                      : remaining < 30
                      ? "text-amber-600 dark:text-amber-400"
                      : "text-muted-foreground"
                  )}
                >
                  {message.length}/{MAX_LEN}
                </span>
              </div>
              <Textarea
                id="sms-msg"
                rows={4}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="e.g. Karibu PesaNet! Buy any package today and earn 2x loyalty points."
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="sms-aud">Audience</Label>
                <Select value={audience} onValueChange={setAudience}>
                  <SelectTrigger id="sms-aud" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {AUDIENCES.map((a) => (
                      <SelectItem key={a.value} value={a.value}>
                        {a.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {audience === "by_site" && (
                <div className="flex flex-col gap-2">
                  <Label htmlFor="sms-site">Site</Label>
                  <Select value={audienceFilter} onValueChange={setAudienceFilter}>
                    <SelectTrigger id="sms-site" className="w-full">
                      <SelectValue placeholder="Select site" />
                    </SelectTrigger>
                    <SelectContent>
                      {sites.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {audience === "by_package" && (
                <div className="flex flex-col gap-2">
                  <Label htmlFor="sms-pkg">Package</Label>
                  <Select value={audienceFilter} onValueChange={setAudienceFilter}>
                    <SelectTrigger id="sms-pkg" className="w-full">
                      <SelectValue placeholder="Select package" />
                    </SelectTrigger>
                    <SelectContent>
                      {packages.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {/* Preview */}
            <div className="flex flex-col gap-2 rounded-lg border bg-muted/30 p-3">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-sm font-medium">
                  <Eye className="size-4 text-primary" />
                  Audience preview
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={previewAudience}
                  disabled={previewing || (audience !== "all" && !audienceFilter)}
                >
                  {previewing ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Eye className="size-3.5" />
                  )}
                  Preview
                </Button>
              </div>
              {preview ? (
                <div className="flex flex-col gap-2">
                  <p className="text-sm">
                    <span className="font-bold text-primary">
                      {preview.recipientCount.toLocaleString("en-KE")}
                    </span>{" "}
                    recipient{preview.recipientCount === 1 ? "" : "s"} will
                    receive this message.
                  </p>
                  {preview.sample.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {preview.sample.slice(0, 6).map((p, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center gap-1 rounded-full bg-card px-2 py-0.5 font-mono text-[11px]"
                        >
                          <Smartphone className="size-3 text-muted-foreground" />
                          {p}
                        </span>
                      ))}
                      {preview.recipientCount > preview.sample.length && (
                        <span className="text-xs text-muted-foreground">
                          +{(preview.recipientCount - preview.sample.length).toLocaleString("en-KE")} more
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Click <strong>Preview</strong> to estimate recipient count and
                  see a sample of phones.
                </p>
              )}
            </div>

            <div className="flex items-center justify-end gap-2">
              <Button
                onClick={send}
                disabled={
                  sending || !message.trim() || overLimit || (audience !== "all" && !audienceFilter)
                }
              >
                {sending ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Sending…
                  </>
                ) : (
                  <>
                    <Send className="size-4" />
                    Send broadcast
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* History */}
        <Card className="py-0">
          <CardHeader className="flex-row items-center justify-between px-5 pt-5">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <MessageSquare className="size-4 text-primary" />
                Broadcast history
              </CardTitle>
              <CardDescription>Recent SMS broadcasts.</CardDescription>
            </div>
            <Button variant="outline" size="icon" onClick={loadBroadcasts} aria-label="Refresh">
              <RefreshCw className="size-4" />
            </Button>
          </CardHeader>
          <CardContent className="px-2 pb-3 sm:px-4">
            {loadingList ? (
              <div className="flex flex-col gap-2 p-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-20 w-full rounded-md" />
                ))}
              </div>
            ) : broadcasts.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed bg-muted/30 px-4 py-12 text-center">
                <MessageSquare className="size-6 text-muted-foreground" />
                <p className="text-sm font-medium">No broadcasts yet</p>
                <p className="text-xs text-muted-foreground">
                  Your sent broadcasts will appear here.
                </p>
              </div>
            ) : (
              <ul className="flex max-h-[60vh] flex-col gap-2 overflow-y-auto custom-scroll p-1">
                {broadcasts.map((b, i) => (
                  <motion.li
                    key={b.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(i * 0.02, 0.2) }}
                    className="rounded-lg border bg-card p-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="line-clamp-2 flex-1 text-sm">{b.message}</p>
                      <Badge
                        variant="outline"
                        className={cn(
                          "shrink-0 capitalize",
                          b.status === "sent"
                            ? "border-transparent bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                            : "border-transparent bg-muted text-muted-foreground"
                        )}
                      >
                        {b.status}
                      </Badge>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <Badge variant="secondary" className="font-normal">
                        {audienceLabel(b.audience, b.audienceFilter)}
                      </Badge>
                      <span className="flex items-center gap-1">
                        <Users className="size-3" />
                        {b.recipientCount.toLocaleString("en-KE")} recipients
                      </span>
                      <span>·</span>
                      <span>{timeAgo(b.createdAt)}</span>
                    </div>
                  </motion.li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function SummaryCard({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode
  label: string
  value: string
  tone: "primary" | "emerald" | "amber"
}) {
  const toneClass =
    tone === "primary"
      ? "bg-primary/10 text-primary"
      : tone === "emerald"
      ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300"
      : "bg-amber-500/15 text-amber-600 dark:text-amber-300"
  return (
    <Card className="py-0">
      <CardContent className="flex items-center gap-4 p-5">
        <div className={`grid size-11 place-items-center rounded-xl ${toneClass}`}>
          {icon}
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="truncate text-xl font-bold tabular-nums">{value}</p>
        </div>
      </CardContent>
    </Card>
  )
}
