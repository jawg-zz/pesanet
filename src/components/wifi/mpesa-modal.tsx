"use client"

import { useEffect, useRef, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import {
  CheckCircle2,
  Copy,
  Loader2,
  Lock,
  Phone,
  Printer,
  Smartphone,
  Sparkles,
  Tag,
  X,
  XCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import type { DiscountPreview, WifiPackage, WifiSession } from "@/lib/types"
import {
  formatDuration,
  formatKES,
  validateKePhone,
} from "@/lib/wifi-utils"
import { useToast } from "@/hooks/use-toast"
import {
  ReceiptPrint,
  type ReceiptData,
} from "@/components/wifi/receipt-print"

type Step = "form" | "waiting" | "success" | "failed"

interface MpesaStatus {
  status: "pending" | "completed" | "failed"
  mpesaRef?: string
  sessionId?: string
  packageName?: string
  priceKES?: number
  message: string
}

export function MpesaModal({
  pkg,
  open,
  onOpenChange,
  onSuccess,
}: {
  pkg: WifiPackage | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: (session: WifiSession) => void
}) {
  const { toast } = useToast()
  const [phone, setPhone] = useState("")
  const [step, setStep] = useState<Step>("form")
  const [transactionId, setTransactionId] = useState<string | null>(null)
  const [mpesaRef, setMpesaRef] = useState<string | null>(null)
  const [session, setSession] = useState<WifiSession | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Promo code state
  const [promoInput, setPromoInput] = useState("")
  const [appliedPromo, setAppliedPromo] = useState<string | null>(null)
  const [discount, setDiscount] = useState<DiscountPreview | null>(null)
  const [validating, setValidating] = useState(false)
  const [receiptOpen, setReceiptOpen] = useState(false)

  const finalAmount = discount?.valid ? discount.finalAmountKES : pkg?.priceKES ?? 0
  const hasDiscount = discount?.valid && (discount.discountKES ?? 0) > 0

  // Reset when closed / opened fresh.
  useEffect(() => {
    if (open) {
      setStep("form")
      setTransactionId(null)
      setMpesaRef(null)
      setSession(null)
      setSubmitting(false)
      setPromoInput("")
      setAppliedPromo(null)
      setDiscount(null)
    }
  }, [open])

  // Cleanup polling on unmount or close.
  useEffect(() => {
    if (!open && pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current)
        pollRef.current = null
      }
    }
  }, [open])

  if (!pkg) return null

  async function applyPromo() {
    const code = promoInput.trim().toUpperCase()
    if (!code) {
      toast({
        title: "Enter code",
        description: "Please enter a promo code.",
        variant: "destructive",
      })
      return
    }
    if (!pkg) return
    setValidating(true)
    try {
      const res = await fetch("/api/promos/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, amountKES: pkg.priceKES }),
      })
      const data = (await res.json()) as DiscountPreview
      if (!res.ok || !data.valid) {
        setAppliedPromo(null)
        setDiscount({ ...data, valid: false })
        toast({
          title: "Promo not applied",
          description: data.message || "Invalid promo code.",
          variant: "destructive",
        })
        return
      }
      setAppliedPromo(code)
      setDiscount(data)
      toast({
        title: "Promo applied 🎉",
        description: `${formatKES(data.discountKES)} off — pay ${formatKES(data.finalAmountKES)}.`,
      })
    } catch {
      toast({
        title: "Error",
        description: "Could not validate promo code.",
        variant: "destructive",
      })
    } finally {
      setValidating(false)
    }
  }

  function clearPromo() {
    setPromoInput("")
    setAppliedPromo(null)
    setDiscount(null)
  }

  async function sendStk() {
    if (!pkg) return
    if (!validateKePhone(phone)) {
      toast({
        title: "Invalid phone",
        description: "Enter a valid Kenyan number (07XXXXXXXX or 01XXXXXXXX).",
        variant: "destructive",
      })
      return
    }
    setSubmitting(true)
    try {
      const body: Record<string, unknown> = {
        phone: phone.trim(),
        packageId: pkg.id,
      }
      if (appliedPromo) body.promoCode = appliedPromo
      const res = await fetch("/api/mpesa/stk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || "Failed to send STK push")
      setTransactionId(data.transactionId)
      setStep("waiting")
      startPolling(data.transactionId)
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to send STK push"
      toast({
        title: "STK push failed",
        description: msg,
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  function startPolling(txId: string) {
    if (pollRef.current) clearInterval(pollRef.current)
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/mpesa/status/${txId}`)
        if (!res.ok) return
        const data = (await res.json()) as MpesaStatus
        if (data.status === "completed") {
          if (pollRef.current) {
            clearInterval(pollRef.current)
            pollRef.current = null
          }
          setMpesaRef(data.mpesaRef ?? null)
          // Try to fetch the resulting session for display.
          if (data.sessionId) {
            try {
              const sres = await fetch(
                `/api/sessions/active?phone=${encodeURIComponent(phone.trim())}`
              )
              if (sres.ok) {
                const sdata = (await sres.json()) as { session: WifiSession | null }
                if (sdata.session) {
                  setSession(sdata.session)
                  onSuccess?.(sdata.session)
                }
              }
            } catch {
              /* ignore */
            }
          }
          setStep("success")
        } else if (data.status === "failed") {
          if (pollRef.current) {
            clearInterval(pollRef.current)
            pollRef.current = null
          }
          setStep("failed")
        }
      } catch {
        /* swallow polling errors */
      }
    }, 1500)
  }

  function handleClose(open: boolean) {
    if (!open && pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
    onOpenChange(open)
  }

  function openReceipt() {
    if (!pkg || !mpesaRef) return
    setReceiptOpen(true)
  }

  const receiptData: ReceiptData | null =
    pkg && mpesaRef
      ? {
          mpesaRef,
          phone: phone.trim() || session?.phone || "—",
          packageName: pkg.name,
          priceKES: pkg.priceKES,
          discountKES: discount?.valid ? discount.discountKES : 0,
          promoCode: appliedPromo,
          durationMinutes: pkg.durationMinutes,
          startTime: session?.startTime ?? new Date().toISOString(),
          endTime:
            session?.endTime ??
            new Date(
              Date.now() + pkg.durationMinutes * 60 * 1000
            ).toISOString(),
        }
      : null

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Smartphone className="size-5 text-primary" />
            Lipa na M-Pesa
          </DialogTitle>
          <DialogDescription>
            Pay securely with the Safaricom M-Pesa STK push.
          </DialogDescription>
        </DialogHeader>

        <AnimatePresence mode="wait">
          {step === "form" && (
            <motion.div
              key="form"
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              className="flex flex-col gap-4"
            >
              <div className="rounded-lg border bg-muted/40 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Package</span>
                  <span className="font-semibold">{pkg.name}</span>
                </div>
                <Separator className="my-3" />
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <span className="text-muted-foreground">Duration</span>
                  <span className="text-right">
                    {formatDuration(pkg.durationMinutes)}
                  </span>
                  <span className="text-muted-foreground">Data</span>
                  <span className="text-right">
                    {pkg.dataLimitMB <= 0 ? "Unlimited" : `${pkg.dataLimitMB} MB`}
                  </span>
                  <span className="text-muted-foreground">Speed</span>
                  <span className="text-right">
                    {pkg.downloadSpeedMbps}/{pkg.uploadSpeedMbps} Mbps
                  </span>
                </div>
                <Separator className="my-3" />
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Total</span>
                  <div className="flex flex-col items-end">
                    {hasDiscount && (
                      <span className="text-xs text-muted-foreground line-through">
                        {formatKES(pkg.priceKES)}
                      </span>
                    )}
                    <span className="text-xl font-bold text-primary">
                      {formatKES(finalAmount)}
                    </span>
                    {hasDiscount && (
                      <span className="text-[10px] font-medium uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
                        saved {formatKES(discount?.discountKES ?? 0)}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Promo code section */}
              <div className="flex flex-col gap-2">
                <Label htmlFor="mpesa-promo" className="flex items-center gap-1.5">
                  <Tag className="size-3.5 text-primary" />
                  Promo code <span className="text-muted-foreground">(optional)</span>
                </Label>
                {appliedPromo ? (
                  <div className="flex items-center justify-between rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm">
                    <span className="flex items-center gap-2">
                      <Sparkles className="size-4 text-emerald-600 dark:text-emerald-400" />
                      <span className="font-mono font-semibold uppercase text-emerald-700 dark:text-emerald-300">
                        {appliedPromo}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        −{formatKES(discount?.discountKES ?? 0)}
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={clearPromo}
                      aria-label="Remove promo"
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <X className="size-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Input
                      id="mpesa-promo"
                      placeholder="e.g. WELCOME10"
                      value={promoInput}
                      onChange={(e) =>
                        setPromoInput(e.target.value.toUpperCase())
                      }
                      className="font-mono tracking-wide"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") applyPromo()
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={applyPromo}
                      disabled={validating || !promoInput.trim()}
                    >
                      {validating ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        "Apply"
                      )}
                    </Button>
                  </div>
                )}
                {discount && !discount.valid && (
                  <p className="text-xs text-destructive">{discount.message}</p>
                )}
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="mpesa-phone">M-Pesa phone number</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="mpesa-phone"
                    inputMode="tel"
                    placeholder="07XX XXX XXX"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  You'll receive a prompt on this phone to enter your M-Pesa PIN.
                </p>
              </div>

              <Button
                onClick={sendStk}
                disabled={submitting}
                size="lg"
                className="w-full"
              >
                {submitting ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Sending STK…
                  </>
                ) : (
                  <>
                    <Lock className="size-4" />
                    Send STK Push · {formatKES(finalAmount)}
                  </>
                )}
              </Button>
            </motion.div>
          )}

          {step === "waiting" && (
            <motion.div
              key="waiting"
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              className="flex flex-col items-center gap-4"
            >
              <div className="flex flex-col items-center gap-2 text-center">
                <div className="relative">
                  <div className="absolute inset-0 animate-ping rounded-full bg-primary/30" />
                  <div className="relative grid size-14 place-items-center rounded-full bg-primary/10">
                    <Loader2 className="size-7 animate-spin text-primary" />
                  </div>
                </div>
                <p className="text-sm font-medium">
                  Waiting for you to enter your M-Pesa PIN
                </p>
                <p className="text-xs text-muted-foreground">
                  Check your phone{" "}
                  <span className="font-mono font-semibold text-foreground">
                    {phone || "—"}
                  </span>{" "}
                  for the STK prompt.
                </p>
              </div>

              {/* Phone mockup with M-Pesa STK screen */}
              <div className="mx-auto w-full max-w-[240px]">
                <div className="rounded-[2rem] border-4 border-foreground/80 bg-foreground p-2 shadow-xl">
                  <div className="rounded-[1.5rem] bg-background">
                    <div className="flex items-center justify-between px-3 py-1.5 text-[10px] text-muted-foreground">
                      <span>9:41</span>
                      <span>●●● 4G</span>
                    </div>
                    <div className="bg-emerald-600 px-3 py-3 text-white">
                      <div className="text-xs font-semibold uppercase tracking-wide opacity-80">
                        Lipa na M-Pesa
                      </div>
                      <div className="mt-1 text-[11px] opacity-90">
                        PesaNet Ltd · Paybill 247247
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 px-3 py-3 text-xs">
                      <Row label="Amount" value={formatKES(finalAmount)} />
                      <Row label="Account" value="PesaNet" />
                      {appliedPromo && (
                        <Row label="Promo" value={appliedPromo} />
                      )}
                      <Separator className="my-1" />
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">
                          Enter M-Pesa PIN
                        </span>
                        <span className="font-mono tracking-[0.4em]">
                          ••••
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2 px-3 pb-3">
                      <div className="flex-1 rounded-md border border-destructive/40 py-1 text-center text-[11px] font-medium text-destructive">
                        Cancel
                      </div>
                      <div className="flex-1 rounded-md bg-emerald-600 py-1 text-center text-[11px] font-medium text-white">
                        Send
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <p className="text-center text-[11px] text-muted-foreground">
                This is a simulated STK prompt. Payment completes automatically in
                a few seconds.
              </p>
            </motion.div>
          )}

          {step === "success" && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex flex-col items-center gap-4 text-center"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 220, damping: 16 }}
                className="grid size-16 place-items-center rounded-full bg-emerald-500/15"
              >
                <CheckCircle2 className="size-9 text-emerald-600" />
              </motion.div>
              <div>
                <h3 className="text-lg font-bold">You're now connected!</h3>
                <p className="text-sm text-muted-foreground">
                  Payment of {formatKES(finalAmount)} received.
                </p>
              </div>

              <div className="w-full rounded-lg border bg-muted/40 p-4 text-left text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">M-Pesa ref</span>
                  <button
                    type="button"
                    onClick={() => {
                      if (mpesaRef) {
                        navigator.clipboard?.writeText(mpesaRef)
                        toast({
                          title: "Copied",
                          description: "M-Pesa reference copied to clipboard.",
                        })
                      }
                    }}
                    className="flex items-center gap-1.5 font-mono font-semibold text-primary hover:underline"
                  >
                    {mpesaRef ?? "—"}
                    <Copy className="size-3" />
                  </button>
                </div>
                <Separator className="my-3" />
                <div className="grid grid-cols-2 gap-2">
                  <span className="text-muted-foreground">Package</span>
                  <span className="text-right font-medium">{pkg.name}</span>
                  <span className="text-muted-foreground">Duration</span>
                  <span className="text-right">
                    {formatDuration(pkg.durationMinutes)}
                  </span>
                  {session && (
                    <>
                      <span className="text-muted-foreground">IP</span>
                      <span className="text-right font-mono">
                        {session.ipAddress ?? "—"}
                      </span>
                    </>
                  )}
                </div>
              </div>

              <div className="flex w-full gap-2">
                <Button
                  onClick={openReceipt}
                  variant="outline"
                  className="flex-1"
                  size="lg"
                  disabled={!mpesaRef}
                >
                  <Printer className="size-4" />
                  Print Receipt
                </Button>
                <Button
                  onClick={() => handleClose(false)}
                  className="flex-1"
                  size="lg"
                >
                  Done
                </Button>
              </div>
            </motion.div>
          )}

          {step === "failed" && (
            <motion.div
              key="failed"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex flex-col items-center gap-4 text-center"
            >
              <div className="grid size-16 place-items-center rounded-full bg-destructive/15">
                <XCircle className="size-9 text-destructive" />
              </div>
              <div>
                <h3 className="text-lg font-bold">Payment failed</h3>
                <p className="text-sm text-muted-foreground">
                  The M-Pesa transaction did not complete.
                </p>
              </div>
              <div className="flex w-full gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => handleClose(false)}
                >
                  Close
                </Button>
                <Button
                  className="flex-1"
                  onClick={() => setStep("form")}
                >
                  Try again
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>

      {/* Printable receipt */}
      <ReceiptPrint
        data={receiptData}
        open={receiptOpen}
        onOpenChange={setReceiptOpen}
      />
    </Dialog>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  )
}
