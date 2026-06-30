/**
 * Sliding-window in-memory rate limiter.
 *
 * Protects purchase / voucher / OTP endpoints from abuse (brute-force voucher
 * guessing, M-Pesa STK spam, OTP bombing). Each identified client (by phone
 * or IP) gets a rolling window of N requests per period; requests beyond the
 * limit are rejected with 429.
 *
 * In a multi-instance deployment this would use Redis; the interface is
 * kept simple so a Redis adapter can replace it later.
 */

interface WindowEntry {
  timestamps: number[]
}

const windows = new Map<string, WindowEntry>()

export const rateLimitStats = {
  totalRequests: 0,
  totalLimited: 0,
  get trackedKeys() {
    return windows.size
  },
}

interface RateLimitConfig {
  /** Max requests allowed within the window. */
  limit: number
  /** Window duration in ms. */
  windowMs: number
}

const DEFAULT_CONFIG: RateLimitConfig = {
  limit: 10,
  windowMs: 60_000, // 1 minute
}

/**
 * Check whether a key is within its rate limit. Returns { allowed, remaining,
 * resetInMs }. Callers should reject with 429 when `allowed` is false.
 */
export function rateLimitCheck(
  key: string,
  config: Partial<RateLimitConfig> = {}
): { allowed: boolean; remaining: number; resetInMs: number; limit: number } {
  const { limit, windowMs } = { ...DEFAULT_CONFIG, ...config }
  const now = Date.now()
  const cutoff = now - windowMs

  let entry = windows.get(key)
  if (!entry) {
    entry = { timestamps: [] }
    windows.set(key, entry)
  }

  // Drop timestamps outside the window.
  entry.timestamps = entry.timestamps.filter((t) => t > cutoff)

  rateLimitStats.totalRequests++

  if (entry.timestamps.length >= limit) {
    rateLimitStats.totalLimited++
    const oldest = entry.timestamps[0]
    return {
      allowed: false,
      remaining: 0,
      resetInMs: oldest + windowMs - now,
      limit,
    }
  }

  entry.timestamps.push(now)
  return {
    allowed: true,
    remaining: limit - entry.timestamps.length,
    resetInMs: windowMs,
    limit,
  }
}

/** Convenience: rate-limit a purchase-style endpoint by phone number. */
export function checkPurchaseRateLimit(phone: string) {
  return rateLimitCheck(`purchase:${phone}`, { limit: 10, windowMs: 60_000 })
}

/** Convenience: rate-limit OTP requests by phone (stricter). */
export function checkOtpRateLimit(phone: string) {
  return rateLimitCheck(`otp:${phone}`, { limit: 3, windowMs: 5 * 60_000 })
}

/** Convenience: rate-limit by IP for general endpoints. */
export function checkIpRateLimit(ip: string, limit = 60) {
  return rateLimitCheck(`ip:${ip}`, { limit, windowMs: 60_000 })
}

/** Extract the client IP from a Next.js Request (behind Caddy/gateway). */
export function getClientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for")
  if (xff) return xff.split(",")[0].trim()
  const real = req.headers.get("x-real-ip")
  if (real) return real
  return "unknown"
}

/** Snapshot of rate-limit stats for observability. */
export function getRateLimitStats() {
  return {
    totalRequests: rateLimitStats.totalRequests,
    totalLimited: rateLimitStats.totalLimited,
    trackedKeys: rateLimitStats.trackedKeys,
  }
}
