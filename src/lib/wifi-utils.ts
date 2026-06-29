// Utility helpers for the WiFi billing system (formatting, duration, vouchers).

/** Format an amount in Kenyan Shillings. */
export function formatKES(amount: number): string {
  return `KES ${amount.toLocaleString("en-KE")}`
}

/** Human readable duration from minutes. */
export function formatDuration(minutes: number): string {
  if (minutes <= 0) return "0 min"
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (minutes % 1440 === 0) {
    const days = minutes / 1440
    return days === 1 ? "1 day" : `${days} days`
  }
  if (minutes < 1440) {
    return mins === 0 ? `${hours} hr` : `${hours} hr ${mins} min`
  }
  const days = Math.floor(minutes / 1440)
  const remHours = Math.floor((minutes % 1440) / 60)
  return remHours === 0 ? `${days} day${days > 1 ? "s" : ""}` : `${days}d ${remHours}h`
}

/** Format a data limit in MB to a human readable string. */
export function formatData(mb: number): string {
  if (mb <= 0) return "Unlimited"
  if (mb < 1024) return `${mb} MB`
  const gb = mb / 1024
  return Number.isInteger(gb) ? `${gb} GB` : `${gb.toFixed(1)} GB`
}

/** Format a relative time (e.g. "3 min ago"). */
export function timeAgo(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date
  const seconds = Math.floor((Date.now() - d.getTime()) / 1000)
  if (seconds < 60) return "just now"
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} hr ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days} day${days > 1 ? "s" : ""} ago`
  return d.toLocaleDateString("en-KE", { day: "numeric", month: "short" })
}

/** Format a datetime for display. */
export function formatDateTime(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date
  return d.toLocaleString("en-KE", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  })
}

/** Time remaining until a given end date, as a human readable countdown. */
export function timeRemaining(endDate: string | Date): string {
  const end = typeof endDate === "string" ? new Date(endDate) : endDate
  const ms = end.getTime() - Date.now()
  if (ms <= 0) return "Expired"
  const totalSeconds = Math.floor(ms / 1000)
  const days = Math.floor(totalSeconds / 86400)
  const hours = Math.floor((totalSeconds % 86400) / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  if (days > 0) return `${days}d ${hours}h ${minutes}m`
  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`
  return `${minutes}m ${seconds}s`
}

/** Progress 0..1 of a session based on start/end time. */
export function sessionProgress(startTime: string | Date, endTime: string | Date): number {
  const start = typeof startTime === "string" ? new Date(startTime) : startTime
  const end = typeof endTime === "string" ? new Date(endTime) : endTime
  const total = end.getTime() - start.getTime()
  const elapsed = Date.now() - start.getTime()
  if (total <= 0) return 1
  return Math.min(1, Math.max(0, elapsed / total))
}

/** Validate a Kenyan Safaricom-style phone number (07XXXXXXXX or 01XXXXXXXX). */
export function validateKePhone(phone: string): boolean {
  const cleaned = phone.replace(/\s+/g, "")
  return /^(?:\+?254|0)?7\d{8}$|^(?:\+?254|0)?1\d{8}$/.test(cleaned)
}

/** Normalise a Kenyan phone number to 2547XXXXXXXX format. */
export function normaliseKePhone(phone: string): string {
  const cleaned = phone.replace(/\s+/g, "").replace(/[-()]/g, "")
  if (cleaned.startsWith("+254")) return cleaned.slice(1)
  if (cleaned.startsWith("254")) return cleaned
  if (cleaned.startsWith("0")) return "254" + cleaned.slice(1)
  return cleaned
}

/** Generate a random voucher code (e.g. WFI-4827-9163). */
export function generateVoucherCode(): string {
  const part = () => Math.floor(1000 + Math.random() * 9000).toString()
  return `WFI-${part()}-${part()}`
}

/** Generate a realistic M-Pesa transaction reference code. */
export function generateMpesaRef(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ0123456789"
  let ref = ""
  for (let i = 0; i < 10; i++) ref += chars[Math.floor(Math.random() * chars.length)]
  return ref
}

/** Generate a fake but realistic IP address. */
export function generateFakeIP(): string {
  return `10.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${1 + Math.floor(Math.random() * 254)}`
}

/** Generate a fake MAC address. */
export function generateFakeMAC(): string {
  const hex = "0123456789ABCDEF"
  const parts: string[] = []
  for (let i = 0; i < 6; i++) {
    let part = ""
    for (let j = 0; j < 2; j++) part += hex[Math.floor(Math.random() * 16)]
    parts.push(part)
  }
  return parts.join(":")
}

const MONTH_ABBR = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
]

/**
 * Return the calendar date parts (year, month, day) for a given instant,
 * interpreted in the Africa/Nairobi (UTC+3) timezone. Robust against DST
 * (Nairobi has none) and server-local timezone.
 */
export function nairobiDateParts(date: Date = new Date()): {
  year: string
  month: string
  day: string
  monthIndex: number
} {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Nairobi",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
  const parts = fmt.formatToParts(date)
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? ""
  const year = get("year")
  const month = get("month")
  const day = get("day")
  return { year, month, day, monthIndex: parseInt(month, 10) - 1 }
}

/** The UTC instant corresponding to 00:00 (midnight) of the Nairobi day containing `date`. */
export function startOfDayNairobi(date: Date = new Date()): Date {
  const { year, month, day } = nairobiDateParts(date)
  // Nairobi is UTC+3, so midnight EAT = YYYY-MM-DDT00:00:00+03:00
  return new Date(`${year}-${month}-${day}T00:00:00+03:00`)
}

/** "DD Mon" label (e.g. "30 Jun") for the Nairobi calendar day containing `date`. */
export function formatNairobiDayLabel(date: Date = new Date()): string {
  const { day, monthIndex } = nairobiDateParts(date)
  return `${day} ${MONTH_ABBR[monthIndex]}`
}
