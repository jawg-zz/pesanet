"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { CheckCircle2, Printer, Receipt as ReceiptIcon, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  formatDateTime,
  formatDuration,
  formatKES,
} from "@/lib/wifi-utils"

export interface ReceiptData {
  mpesaRef: string
  phone: string
  packageName: string
  priceKES: number
  discountKES: number
  promoCode: string | null
  durationMinutes: number
  startTime: string
  endTime: string
}

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

function buildReceiptHtml(d: ReceiptData): string {
  const paid = Math.max(0, d.priceKES - (d.discountKES ?? 0))
  const hasDiscount = (d.discountKES ?? 0) > 0
  const fmtMoney = (n: number) => `KES ${n.toLocaleString("en-KE")}`
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>PesaNet Receipt ${esc(d.mpesaRef)}</title>
<style>
  * { box-sizing: border-box; }
  body {
    margin: 0;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    background: #f4f4f5;
    color: #18181b;
    padding: 24px;
    display: flex;
    justify-content: center;
  }
  .receipt {
    width: 100%;
    max-width: 360px;
    background: #fff;
    border-radius: 16px;
    overflow: hidden;
    box-shadow: 0 10px 40px rgba(0,0,0,0.08);
    border: 1px solid #e4e4e7;
  }
  .receipt-header {
    background: linear-gradient(135deg, #15803d, #047857);
    color: #fff;
    padding: 24px 20px;
    text-align: center;
  }
  .receipt-header .brand {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    font-size: 22px;
    font-weight: 800;
    letter-spacing: -0.02em;
  }
  .receipt-header .sub {
    margin-top: 4px;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    opacity: 0.85;
  }
  .receipt-body { padding: 20px; }
  .mpesa-ref-box {
    background: #f0fdf4;
    border: 1px dashed #86efac;
    border-radius: 10px;
    padding: 12px;
    text-align: center;
    margin-bottom: 16px;
  }
  .mpesa-ref-box .label {
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: #15803d;
    margin-bottom: 4px;
  }
  .mpesa-ref-box .ref {
    font-family: "SFMono-Regular", Menlo, Monaco, Consolas, monospace;
    font-size: 18px;
    font-weight: 800;
    color: #14532d;
    letter-spacing: 0.05em;
  }
  .row {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    padding: 8px 0;
    border-bottom: 1px dashed #e4e4e7;
    font-size: 13px;
  }
  .row:last-child { border-bottom: none; }
  .row .k { color: #71717a; }
  .row .v {
    font-weight: 600;
    text-align: right;
    font-variant-numeric: tabular-nums;
  }
  .row .v.mono {
    font-family: "SFMono-Regular", Menlo, Monaco, Consolas, monospace;
  }
  .strike { text-decoration: line-through; color: #a1a1aa; font-weight: 400; font-size: 11px; }
  .discount { color: #15803d; font-size: 11px; font-weight: 600; }
  .total {
    background: #fafafa;
    border-radius: 10px;
    padding: 12px 14px;
    margin-top: 14px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .total .k { font-size: 12px; color: #71717a; text-transform: uppercase; letter-spacing: 0.08em; }
  .total .v {
    font-size: 20px;
    font-weight: 800;
    color: #14532d;
    font-variant-numeric: tabular-nums;
  }
  .paybill {
    margin-top: 14px;
    padding: 10px 12px;
    background: #f4f4f5;
    border-radius: 8px;
    text-align: center;
    font-size: 11px;
    color: #52525b;
  }
  .paybill strong { color: #18181b; }
  .thanks {
    margin-top: 16px;
    text-align: center;
    font-size: 13px;
    font-weight: 700;
    color: #15803d;
  }
  .footer {
    margin-top: 4px;
    text-align: center;
    font-size: 10px;
    color: #a1a1aa;
  }
  @media print {
    body { background: #fff; padding: 0; }
    .receipt { box-shadow: none; border: none; max-width: 100%; border-radius: 0; }
    @page { margin: 12mm; }
  }
</style>
</head>
<body>
  <div class="receipt">
    <div class="receipt-header">
      <div class="brand">📡 PesaNet WiFi</div>
      <div class="sub">Payment Receipt</div>
    </div>
    <div class="receipt-body">
      <div class="mpesa-ref-box">
        <div class="label">M-Pesa Reference</div>
        <div class="ref">${esc(d.mpesaRef)}</div>
      </div>
      <div class="row">
        <span class="k">Date / Time</span>
        <span class="v">${esc(formatDateTime(d.startTime))}</span>
      </div>
      <div class="row">
        <span class="k">Phone</span>
        <span class="v mono">${esc(d.phone)}</span>
      </div>
      <div class="row">
        <span class="k">Package</span>
        <span class="v">${esc(d.packageName)}</span>
      </div>
      <div class="row">
        <span class="k">Duration</span>
        <span class="v">${esc(formatDuration(d.durationMinutes))}</span>
      </div>
      <div class="row">
        <span class="k">Session start</span>
        <span class="v">${esc(formatDateTime(d.startTime))}</span>
      </div>
      <div class="row">
        <span class="k">Session end</span>
        <span class="v">${esc(formatDateTime(d.endTime))}</span>
      </div>
      <div class="row">
        <span class="k">Amount</span>
        <span class="v">
          ${
            hasDiscount
              ? `<span class="strike">${esc(fmtMoney(d.priceKES))}</span> `
              : ``
          }
          ${esc(fmtMoney(d.priceKES))}
        </span>
      </div>
      ${
        hasDiscount
          ? `<div class="row">
              <span class="k">Promo code</span>
              <span class="v mono">${esc(d.promoCode ?? "")}</span>
            </div>
            <div class="row">
              <span class="k">Discount</span>
              <span class="v discount">− ${esc(fmtMoney(d.discountKES))}</span>
            </div>`
          : ``
      }
      <div class="total">
        <span class="k">Amount Paid</span>
        <span class="v">${esc(fmtMoney(paid))}</span>
      </div>
      <div class="paybill">
        Paid via <strong>Safaricom M-Pesa</strong> · Paybill <strong>247247</strong> · Account <strong>PesaNet</strong>
      </div>
      <div class="thanks">Thank you for using PesaNet! 🙏</div>
      <div class="footer">Powered by PesaNet WiFi Billing · support@pesanet.co.ke</div>
    </div>
  </div>
  <script>
    window.onload = function() {
      setTimeout(function() { window.print(); }, 250);
    };
  </script>
</body>
</html>`
}

export function ReceiptPrint({
  data,
  open,
  onOpenChange,
}: {
  data: ReceiptData | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [printing, setPrinting] = useState(false)

  function handlePrint() {
    if (!data) return
    setPrinting(true)
    try {
      const html = buildReceiptHtml(data)
      const w = window.open("", "_blank", "width=420,height=720")
      if (!w) {
        // Pop-up blocked — fall back to a data URL.
        const blob = new Blob([html], { type: "text/html" })
        const url = URL.createObjectURL(blob)
        window.location.href = url
        return
      }
      w.document.open()
      w.document.write(html)
      w.document.close()
    } finally {
      setTimeout(() => setPrinting(false), 800)
    }
  }

  if (!data) return null

  const paid = Math.max(0, data.priceKES - (data.discountKES ?? 0))
  const hasDiscount = (data.discountKES ?? 0) > 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ReceiptIcon className="size-4 text-primary" />
            Payment Receipt
          </DialogTitle>
          <DialogDescription>
            Print or save this M-Pesa receipt for your records.
          </DialogDescription>
        </DialogHeader>

        {/* On-screen receipt preview (mirrors the print version) */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="overflow-hidden rounded-xl border bg-white"
        >
          <div className="bg-gradient-to-br from-primary to-emerald-700 px-5 py-4 text-center text-primary-foreground">
            <div className="flex items-center justify-center gap-2 text-lg font-extrabold tracking-tight">
              <span>📡 PesaNet WiFi</span>
            </div>
            <div className="mt-0.5 text-[10px] uppercase tracking-[0.12em] opacity-85">
              Payment Receipt
            </div>
          </div>

          <div className="p-5">
            <div className="mb-4 rounded-lg border border-dashed border-emerald-300 bg-emerald-50 px-4 py-3 text-center dark:border-emerald-700/50 dark:bg-emerald-900/20">
              <div className="text-[10px] font-medium uppercase tracking-[0.1em] text-emerald-700 dark:text-emerald-300">
                M-Pesa Reference
              </div>
              <div className="mt-1 font-mono text-lg font-extrabold tracking-wider text-emerald-900 dark:text-emerald-100">
                {data.mpesaRef}
              </div>
            </div>

            <dl className="flex flex-col text-sm">
              <Row k="Date / Time" v={formatDateTime(data.startTime)} />
              <Row k="Phone" v={data.phone} mono />
              <Row k="Package" v={data.packageName} />
              <Row k="Duration" v={formatDuration(data.durationMinutes)} />
              <Row k="Session start" v={formatDateTime(data.startTime)} />
              <Row k="Session end" v={formatDateTime(data.endTime)} />
              <Row
                k="Amount"
                v={
                  hasDiscount ? (
                    <span>
                      <span className="mr-1 text-xs text-muted-foreground line-through">
                        {formatKES(data.priceKES)}
                      </span>
                      {formatKES(data.priceKES)}
                    </span>
                  ) : (
                    formatKES(data.priceKES)
                  )
                }
              />
              {hasDiscount && (
                <>
                  <Row
                    k="Promo code"
                    v={data.promoCode ?? "—"}
                    mono
                  />
                  <Row
                    k="Discount"
                    v={
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                        − {formatKES(data.discountKES)}
                      </span>
                    }
                  />
                </>
              )}
            </dl>

            <div className="mt-3 flex items-center justify-between rounded-lg bg-muted/60 px-4 py-2.5">
              <span className="text-xs uppercase tracking-wide text-muted-foreground">
                Amount Paid
              </span>
              <span className="text-xl font-extrabold tabular-nums text-emerald-700 dark:text-emerald-300">
                {formatKES(paid)}
              </span>
            </div>

            <div className="mt-3 rounded-md bg-muted/40 px-3 py-2 text-center text-[11px] text-muted-foreground">
              Paid via <strong className="text-foreground">Safaricom M-Pesa</strong>{" "}
              · Paybill <strong className="text-foreground">247247</strong> ·
              Account <strong className="text-foreground">PesaNet</strong>
            </div>

            <div className="mt-3 flex items-center justify-center gap-1.5 text-sm font-bold text-emerald-700 dark:text-emerald-300">
              <CheckCircle2 className="size-4" />
              Thank you for using PesaNet!
            </div>
          </div>
        </motion.div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => onOpenChange(false)}
          >
            <X className="size-4" />
            Close
          </Button>
          <Button className="flex-1" onClick={handlePrint} disabled={printing}>
            <Printer className="size-4" />
            {printing ? "Opening…" : "Print Receipt"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function Row({
  k,
  v,
  mono,
}: {
  k: string
  v: React.ReactNode
  mono?: boolean
}) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-dashed border-border py-2 last:border-0">
      <dt className="text-muted-foreground">{k}</dt>
      <dd
        className={`text-right font-semibold tabular-nums ${
          mono ? "font-mono" : ""
        }`}
      >
        {v}
      </dd>
    </div>
  )
}
