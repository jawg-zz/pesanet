/**
 * Lightweight in-process TTL cache with LRU eviction.
 *
 * Designed for hot read paths (packages, settings, sites, admin stats,
 * analytics) where the data changes infrequently relative to read volume.
 * Each entry has a per-key TTL; stale entries are evicted lazily on read and
 * proactively by a background sweeper.
 *
 * In a horizontally-scaled deployment this would be backed by Redis; the
 * interface here is intentionally simple so a Redis adapter can drop in later.
 */

interface CacheEntry<T> {
  value: T
  expiresAt: number
  lastAccessed: number
  hits: number
}

const DEFAULT_TTL_MS = 30_000 // 30 seconds
const MAX_ENTRIES = 500
const SWEEP_INTERVAL_MS = 60_000

const store = new Map<string, CacheEntry<unknown>>()
let sweeps = 0

/** Stats counters (exposed via /api/health and the scaling panel). */
export const cacheStats = {
  hits: 0,
  misses: 0,
  sets: 0,
  evictions: 0,
  get size() {
    return store.size
  },
  get sweepCount() {
    return sweeps
  },
}

function sweep() {
  sweeps++
  const now = Date.now()
  for (const [key, entry] of store) {
    if (entry.expiresAt <= now) {
      store.delete(key)
      cacheStats.evictions++
    }
  }
}

// Start the background sweeper (runs every 60s).
let sweeperStarted = false
function ensureSweeper() {
  if (sweeperStarted) return
  sweeperStarted = true
  setInterval(sweep, SWEEP_INTERVAL_MS).unref?.()
}

/** Get a cached value, or undefined if missing/expired. */
export function cacheGet<T>(key: string): T | undefined {
  const entry = store.get(key) as CacheEntry<T> | undefined
  if (!entry) {
    cacheStats.misses++
    return undefined
  }
  if (entry.expiresAt <= Date.now()) {
    store.delete(key)
    cacheStats.evictions++
    cacheStats.misses++
    return undefined
  }
  entry.hits++
  entry.lastAccessed = Date.now()
  cacheStats.hits++
  return entry.value
}

/** Set a cached value with a TTL (default 30s). */
export function cacheSet<T>(key: string, value: T, ttlMs: number = DEFAULT_TTL_MS): void {
  ensureSweeper()
  // LRU eviction if at capacity.
  if (store.size >= MAX_ENTRIES && !store.has(key)) {
    let oldestKey: string | null = null
    let oldestTime = Infinity
    for (const [k, e] of store) {
      if (e.lastAccessed < oldestTime) {
        oldestTime = e.lastAccessed
        oldestKey = k
      }
    }
    if (oldestKey) {
      store.delete(oldestKey)
      cacheStats.evictions++
    }
  }
  store.set(key, {
    value,
    expiresAt: Date.now() + ttlMs,
    lastAccessed: Date.now(),
    hits: 0,
  })
  cacheStats.sets++
}

/** Invalidate one or more keys (call after writes that change the data). */
export function cacheInvalidate(...keys: string[]): void {
  for (const key of keys) {
    store.delete(key)
  }
}

/** Invalidate all keys matching a prefix (e.g. "packages:", "stats:"). */
export function cacheInvalidatePrefix(prefix: string): void {
  for (const key of store.keys()) {
    if (key.startsWith(prefix)) {
      store.delete(key)
      cacheStats.evictions++
    }
  }
}

/** Clear the entire cache (used by the scaling panel's "flush" button). */
export function cacheFlush(): void {
  const n = store.size
  store.clear()
  cacheStats.evictions += n
}

/**
 * Cache-through helper: return the cached value if present, otherwise call
 * the loader, cache the result, and return it.
 */
export async function cacheThrough<T>(
  key: string,
  loader: () => Promise<T>,
  ttlMs: number = DEFAULT_TTL_MS
): Promise<T> {
  const cached = cacheGet<T>(key)
  if (cached !== undefined) return cached
  const value = await loader()
  cacheSet(key, value, ttlMs)
  return value
}

/** Snapshot of cache stats for observability. */
export function getCacheStats() {
  const hitRate =
    cacheStats.hits + cacheStats.misses > 0
      ? cacheStats.hits / (cacheStats.hits + cacheStats.misses)
      : 0
  return {
    size: store.size,
    hits: cacheStats.hits,
    misses: cacheStats.misses,
    sets: cacheStats.sets,
    evictions: cacheStats.evictions,
    sweeps: cacheStats.sweepCount,
    hitRate: Math.round(hitRate * 1000) / 10, // %
    maxEntries: MAX_ENTRIES,
  }
}
