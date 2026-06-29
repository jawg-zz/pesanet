"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import {
  Building2,
  Globe,
  Headphones,
  Loader2,
  Power,
  Save,
  Smartphone,
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
import { Switch } from "@/components/ui/switch"
import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/hooks/use-toast"
import type { BusinessSettings } from "@/lib/types"

const BOOL_KEYS = ["mpesaEnabled", "voucherEnabled", "resellerEnabled"]
const NUM_KEYS = ["defaultCommissionRate"]

function isBoolKey(k: string) {
  return BOOL_KEYS.includes(k)
}
function isNumKey(k: string) {
  return NUM_KEYS.includes(k)
}

export function SettingsManager() {
  const { toast } = useToast()
  const [settings, setSettings] = useState<BusinessSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let active = true
    async function load() {
      setLoading(true)
      try {
        const res = await fetch("/api/settings")
        if (!active) return
        const data = (await res.json()) as { settings: BusinessSettings }
        setSettings(data.settings ?? {})
      } catch {
        /* ignore */
      } finally {
        if (active) setLoading(false)
      }
    }
    load()
    return () => {
      active = false
    }
  }, [])

  function update(key: string, value: string) {
    setSettings((prev) => (prev ? { ...prev, [key]: value } : prev))
  }

  async function save() {
    if (!settings) return
    setSaving(true)
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings }),
      })
      if (!res.ok) throw new Error("Failed to save")
      const data = (await res.json()) as { settings: BusinessSettings }
      setSettings(data.settings)
      toast({
        title: "Settings saved",
        description: "Your business settings have been updated.",
      })
    } catch {
      toast({
        title: "Save failed",
        description: "Could not save settings. Please try again.",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading || !settings) {
    return (
      <div className="flex flex-col gap-5">
        <Skeleton className="h-8 w-48 rounded-lg" />
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-72 rounded-xl" />
          <Skeleton className="h-72 rounded-xl" />
        </div>
        <Skeleton className="h-56 rounded-xl" />
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="flex flex-col gap-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Business Settings</h2>
          <p className="text-sm text-muted-foreground">
            Configure your WiFi business, M-Pesa paybill and support details.
          </p>
        </div>
        <Button onClick={save} disabled={saving}>
          {saving ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Save className="size-4" />
          )}
          Save changes
        </Button>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Business */}
        <Card className="py-0">
          <CardHeader className="px-5 pt-5">
            <CardTitle className="flex items-center gap-2 text-base">
              <Building2 className="size-4 text-primary" />
              Business & M-Pesa
            </CardTitle>
            <CardDescription>
              How customers see your brand and where M-Pesa payments land.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 px-5 pb-5">
            <Field
              label="Business name"
              value={settings.businessName ?? ""}
              onChange={(v) => update("businessName", v)}
              placeholder="PesaNet WiFi"
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="M-Pesa paybill number"
                value={settings.paybillNumber ?? ""}
                onChange={(v) => update("paybillNumber", v)}
                placeholder="247247"
              />
              <Field
                label="Account reference"
                value={settings.accountReference ?? ""}
                onChange={(v) => update("accountReference", v)}
                placeholder="PESANET"
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border bg-muted/30 px-4 py-3">
              <div>
                <p className="text-sm font-medium">M-Pesa payments</p>
                <p className="text-xs text-muted-foreground">
                  Allow customers to pay via STK push.
                </p>
              </div>
              <Switch
                checked={settings.mpesaEnabled === "true"}
                onCheckedChange={(c) => update("mpesaEnabled", c ? "true" : "false")}
                aria-label="Toggle M-Pesa payments"
              />
            </div>
          </CardContent>
        </Card>

        {/* Support */}
        <Card className="py-0">
          <CardHeader className="px-5 pt-5">
            <CardTitle className="flex items-center gap-2 text-base">
              <Headphones className="size-4 text-primary" />
              Support & Contact
            </CardTitle>
            <CardDescription>
              Shown on the customer portal and support tickets.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 px-5 pb-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Support phone"
                value={settings.supportPhone ?? ""}
                onChange={(v) => update("supportPhone", v)}
                placeholder="0712345678"
              />
              <Field
                label="Support email"
                value={settings.supportEmail ?? ""}
                onChange={(v) => update("supportEmail", v)}
                placeholder="support@pesanet.co.ke"
              />
            </div>
            <Field
              label="Support hours"
              value={settings.supportHours ?? ""}
              onChange={(v) => update("supportHours", v)}
              placeholder="8:00 AM - 9:00 PM EAT"
            />
            <Field
              label="Notification phone"
              value={settings.notificationPhone ?? ""}
              onChange={(v) => update("notificationPhone", v)}
              placeholder="0712345678"
              hint="Receives alerts for new tickets and payments."
            />
          </CardContent>
        </Card>
      </div>

      {/* Features & reseller */}
      <Card className="py-0">
        <CardHeader className="px-5 pt-5">
          <CardTitle className="flex items-center gap-2 text-base">
            <Power className="size-4 text-primary" />
            Features & Reseller Program
          </CardTitle>
          <CardDescription>
            Toggle modules and configure the agent commission rate.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 px-5 pb-5">
          <ToggleRow
            label="Voucher redemption"
            description="Let customers redeem voucher codes for sessions."
            checked={settings.voucherEnabled === "true"}
            onChange={(c) => update("voucherEnabled", c ? "true" : "false")}
          />
          <Separator />
          <ToggleRow
            label="Reseller / Agent program"
            description="Allow agents to buy vouchers at commission and resell."
            checked={settings.resellerEnabled === "true"}
            onChange={(c) => update("resellerEnabled", c ? "true" : "false")}
          />
          <Separator />
          <div className="grid gap-4 pt-1 sm:grid-cols-2">
            <Field
              label="Default commission rate (%)"
              value={settings.defaultCommissionRate ?? "10"}
              onChange={(v) => update("defaultCommissionRate", v)}
              placeholder="10"
              type="number"
            />
          </div>
        </CardContent>
      </Card>

      {/* Localization */}
      <Card className="py-0">
        <CardHeader className="px-5 pt-5">
          <CardTitle className="flex items-center gap-2 text-base">
            <Globe className="size-4 text-primary" />
            Localization
          </CardTitle>
          <CardDescription>
            Currency and timezone used across reports and billing.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 px-5 pb-5 sm:grid-cols-2">
          <Field
            label="Currency"
            value={settings.currency ?? "KES"}
            onChange={(v) => update("currency", v)}
            placeholder="KES"
          />
          <Field
            label="Timezone"
            value={settings.timezone ?? "Africa/Nairobi"}
            onChange={(v) => update("timezone", v)}
            placeholder="Africa/Nairobi"
          />
        </CardContent>
      </Card>

      {/* Quick reference */}
      <Card className="bg-muted/30 py-0">
        <CardContent className="flex flex-wrap items-center gap-x-6 gap-y-2 px-5 py-4 text-sm">
          <span className="flex items-center gap-2 text-muted-foreground">
            <Smartphone className="size-4 text-primary" />
            Paybill:
            <span className="font-semibold text-foreground">
              {settings.paybillNumber || "—"}
            </span>
          </span>
          <span className="flex items-center gap-2 text-muted-foreground">
            <Building2 className="size-4 text-primary" />
            Account:
            <span className="font-semibold text-foreground">
              {settings.accountReference || "—"}
            </span>
          </span>
          <span className="flex items-center gap-2 text-muted-foreground">
            <Globe className="size-4 text-primary" />
            {settings.timezone || "Africa/Nairobi"}
          </span>
        </CardContent>
      </Card>
    </motion.div>
  )
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  hint,
  type = "text",
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  hint?: string
  type?: string
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-xs font-medium text-muted-foreground">
        {label}
      </Label>
      <Input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string
  description: string
  checked: boolean
  onChange: (c: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} aria-label={label} />
    </div>
  )
}
