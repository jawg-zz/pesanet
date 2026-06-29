"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Phone, Ticket, Wifi } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { WifiSession } from "@/lib/types"
import { validateKePhone } from "@/lib/wifi-utils"
import { useToast } from "@/hooks/use-toast"
import { ActiveSessionCard } from "@/components/wifi/active-session-card"

export function VoucherRedeem({
  onRedeemed,
}: {
  onRedeemed?: (s: WifiSession) => void
}) {
  const { toast } = useToast()
  const [code, setCode] = useState("")
  const [phone, setPhone] = useState("")
  const [loading, setLoading] = useState(false)
  const [session, setSession] = useState<WifiSession | null>(null)

  async function redeem() {
    const trimmed = code.trim().toUpperCase()
    if (!trimmed) {
      toast({
        title: "Enter code",
        description: "Please enter a voucher code.",
        variant: "destructive",
      })
      return
    }
    if (!validateKePhone(phone)) {
      toast({
        title: "Invalid phone",
        description: "Enter a valid Kenyan number (07XXXXXXXX or 01XXXXXXXX).",
        variant: "destructive",
      })
      return
    }
    setLoading(true)
    try {
      const res = await fetch("/api/vouchers/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: trimmed, phone: phone.trim() }),
      })
      const data = await res.json()
      if (!res.ok || data.error) {
        throw new Error(data.error || "Could not redeem voucher")
      }
      toast({
        title: "Voucher redeemed 🎉",
        description: `You're now connected with ${data.session?.packageName ?? "your package"}.`,
      })
      setSession(data.session as WifiSession)
      onRedeemed?.(data.session as WifiSession)
      setCode("")
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not redeem voucher"
      toast({
        title: "Redeem failed",
        description: msg,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="py-0">
      <CardHeader className="px-5 pt-5">
        <CardTitle className="flex items-center gap-2 text-base">
          <Ticket className="size-4 text-primary" />
          Redeem a voucher
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 px-5 pb-5">
        <div className="flex flex-col gap-2">
          <Label htmlFor="voucher-code">Voucher code</Label>
          <Input
            id="voucher-code"
            placeholder="WFI-1234-5678"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            className="font-mono tracking-wider"
            onKeyDown={(e) => {
              if (e.key === "Enter") redeem()
            }}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="voucher-phone">Your phone number</Label>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="voucher-phone"
              inputMode="tel"
              placeholder="07XX XXX XXX"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="pl-9"
              onKeyDown={(e) => {
                if (e.key === "Enter") redeem()
              }}
            />
          </div>
        </div>
        <Button onClick={redeem} disabled={loading} className="w-full">
          {loading ? "Redeeming…" : "Redeem Voucher"}
        </Button>

        {session && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <ActiveSessionCard
              session={session}
              onDisconnected={() => {
                setSession(null)
              }}
            />
          </motion.div>
        )}

        {!session && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Wifi className="size-3.5" />
            Vouchers can be bought from any PesaNet agent.
          </div>
        )}
      </CardContent>
    </Card>
  )
}
