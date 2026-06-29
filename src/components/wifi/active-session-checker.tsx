"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Phone, Search, Ticket, Wifi } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { ActiveSessionCard } from "@/components/wifi/active-session-card"
import type { WifiSession } from "@/lib/types"
import { validateKePhone } from "@/lib/wifi-utils"
import { useToast } from "@/hooks/use-toast"

export function ActiveSessionChecker({
  onSessionChange,
}: {
  onSessionChange?: (s: WifiSession | null) => void
}) {
  const { toast } = useToast()
  const [phone, setPhone] = useState("")
  const [loading, setLoading] = useState(false)
  const [session, setSession] = useState<WifiSession | null>(null)
  const [searched, setSearched] = useState(false)

  async function check() {
    if (!validateKePhone(phone)) {
      toast({
        title: "Invalid phone",
        description: "Enter a valid Kenyan number (07XXXXXXXX or 01XXXXXXXX).",
        variant: "destructive",
      })
      return
    }
    setLoading(true)
    setSearched(true)
    try {
      const res = await fetch(
        `/api/sessions/active?phone=${encodeURIComponent(phone.trim())}`
      )
      if (!res.ok) throw new Error("Failed to check session")
      const data = (await res.json()) as { session: WifiSession | null }
      setSession(data.session)
      onSessionChange?.(data.session)
      if (!data.session) {
        toast({
          title: "No active session",
          description: `No active session found for ${phone}.`,
        })
      }
    } catch {
      toast({
        title: "Error",
        description: "Could not check session. Try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="border-primary/30 py-0">
      <CardHeader className="px-5 pt-5">
        <CardTitle className="flex items-center gap-2 text-base">
          <Search className="size-4 text-primary" />
          Check my active session
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 px-5 pb-5">
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="flex-1">
            <Label htmlFor="phone-check" className="sr-only">
              Phone number
            </Label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="phone-check"
                inputMode="tel"
                placeholder="07XX XXX XXX"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="pl-9"
                onKeyDown={(e) => {
                  if (e.key === "Enter") check()
                }}
              />
            </div>
          </div>
          <Button onClick={check} disabled={loading}>
            {loading ? "Checking…" : "Check my session"}
          </Button>
        </div>

        {loading && (
          <Skeleton className="h-40 w-full rounded-xl" />
        )}

        {!loading && searched && !session && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed bg-muted/30 px-4 py-8 text-center"
          >
            <Wifi className="size-6 text-muted-foreground" />
            <p className="text-sm font-medium">No active session</p>
            <p className="text-xs text-muted-foreground">
              Buy a package or redeem a voucher below to get connected.
            </p>
          </motion.div>
        )}

        {!loading && session && (
          <ActiveSessionCard
            session={session}
            onDisconnected={() => {
              setSession(null)
              onSessionChange?.(null)
            }}
          />
        )}

        {!searched && !session && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Ticket className="size-3.5" />
            Tip: enter your Safaricom number to see your current session.
          </div>
        )}
      </CardContent>
    </Card>
  )
}
