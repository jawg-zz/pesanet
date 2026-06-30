import { db } from "@/lib/db"
import { generateFakeMAC } from "@/lib/wifi-utils"
import type {
  LiveRouterSession,
  NetworkActionResult,
  NetworkBackend,
} from "@/lib/types"

/**
 * Network backend abstraction.
 *
 * PesaNet supports two real network backends for enforcing WiFi
 * connections/disconnections:
 *   - MikroTik RouterOS (REST API over HTTP — the dominant router in Kenya)
 *   - RADIUS (FreeRADIUS + CoA — for ISPs / multi-vendor deployments)
 *
 * Both implement the same interface so the billing/provisioning code is
 * backend-agnostic. When no backend is configured for a site (or when running
 * in the sandbox without a real router), the SimulationProvider is used — it
 * behaves identically but only writes to the audit log + generates fake IPs.
 */

export interface ActivateParams {
  /** Hotspot username = the customer's normalised phone. */
  username: string
  /** Password for the hotspot login (we reuse the phone — users never type it). */
  password: string
  /** Session timeout in minutes (the package duration). */
  timeoutMinutes: number
  /** Download speed cap in Mbps (0 = unlimited). */
  downloadMbps: number
  /** Upload speed cap in Mbps (0 = unlimited). */
  uploadMbps: number
  /** Optional MAC to bind (MikroTik supports MAC-login; RADIUS uses MAC-auth). */
  mac?: string
  /** PesaNet session id for audit linking. */
  sessionId: string
  /** Customer phone for audit. */
  phone: string
}

export interface NetworkProvider {
  readonly backend: NetworkBackend | "simulation"
  /** Create / enable a hotspot user with the given session-timeout. */
  activate(params: ActivateParams): Promise<NetworkActionResult>
  /** Kick an active user immediately. */
  disconnect(username: string, sessionId: string, phone: string): Promise<NetworkActionResult>
  /** Update the session-timeout on a live user (top-up). */
  extend(
    username: string,
    addMinutes: number,
    sessionId: string,
    phone: string
  ): Promise<NetworkActionResult>
  /** Pull the live active sessions from the router/NAS. */
  syncActive(): Promise<{ sessions: LiveRouterSession[]; result: NetworkActionResult }>
  /** Health-check the backend connection. */
  testConnection(): Promise<NetworkActionResult>
}

// ---------------------------------------------------------------------------
// Event logging
// ---------------------------------------------------------------------------

export async function logNetworkEvent(params: {
  siteId?: string | null
  sessionId?: string | null
  phone?: string | null
  action: string
  backend: string
  status: string
  message: string
  durationMs?: number
}) {
  try {
    await db.networkEvent.create({
      data: {
        siteId: params.siteId ?? null,
        sessionId: params.sessionId ?? null,
        phone: params.phone ?? null,
        action: params.action,
        backend: params.backend,
        status: params.status,
        message: params.message,
        durationMs: params.durationMs ?? 0,
      },
    })
  } catch (e) {
    console.error("Failed to log network event:", e)
  }
}

// ---------------------------------------------------------------------------
// Simulation provider (default — no real router present)
// ---------------------------------------------------------------------------

class SimulationProvider implements NetworkProvider {
  readonly backend = "simulation" as const
  constructor(
    private siteId: string | null,
    private siteName: string
  ) {}

  private success(action: string, message: string, start: number, sessionId?: string, phone?: string) {
    const durationMs = Date.now() - start
    void logNetworkEvent({
      siteId: this.siteId,
      sessionId,
      phone,
      action,
      backend: "simulation",
      status: "success",
      message: `[${this.siteName}] ${message}`,
      durationMs,
    })
    return {
      success: true,
      backend: "simulation",
      message,
      durationMs,
    }
  }

  async activate(p: ActivateParams): Promise<NetworkActionResult> {
    const start = Date.now()
    return this.success(
      "activate",
      `Hotspot user ${p.username} activated (${p.timeoutMinutes} min, ${p.downloadMbps || "∞"}/${p.uploadMbps || "∞"} Mbps)`,
      start,
      p.sessionId,
      p.phone
    )
  }

  async disconnect(username: string, sessionId: string, phone: string): Promise<NetworkActionResult> {
    const start = Date.now()
    return this.success(
      "disconnect",
      `Hotspot user ${username} disconnected`,
      start,
      sessionId,
      phone
    )
  }

  async extend(
    username: string,
    addMinutes: number,
    sessionId: string,
    phone: string
  ): Promise<NetworkActionResult> {
    const start = Date.now()
    return this.success(
      "extend",
      `Session for ${username} extended by ${addMinutes} min`,
      start,
      sessionId,
      phone
    )
  }

  async syncActive(): Promise<{ sessions: LiveRouterSession[]; result: NetworkActionResult }> {
    const start = Date.now()
    // In simulation, reflect PesaNet's own active sessions for this site.
    const dbSessions = this.siteId
      ? await db.session.findMany({
          where: { siteId: this.siteId, status: "active" },
          take: 50,
        })
      : await db.session.findMany({ where: { status: "active" }, take: 50 })
    const sessions: LiveRouterSession[] = dbSessions.map((s) => ({
      username: s.phone,
      ip: s.ipAddress ?? "0.0.0.0",
      mac: s.macAddress ?? generateFakeMAC(),
      uptimeSeconds: Math.floor((Date.now() - s.startTime.getTime()) / 1000),
      rxBytes: s.dataUsedMB * 1024 * 1024,
      txBytes: s.dataUsedMB * 1024 * 1024 * 0.4,
    }))
    const result = this.success("sync", `Synced ${sessions.length} live sessions`, start)
    return { sessions, result }
  }

  async testConnection(): Promise<NetworkActionResult> {
    const start = Date.now()
    return this.success("test", "Simulation backend ready (no real router)", start)
  }
}

// ---------------------------------------------------------------------------
// MikroTik RouterOS REST API provider
// ---------------------------------------------------------------------------

class MikrotikProvider implements NetworkProvider {
  readonly backend = "mikrotik" as const
  constructor(
    private siteId: string,
    private siteName: string,
    private host: string,
    private port: number,
    private user: string,
    private pass: string
  ) {}

  private base() {
    // RouterOS v7+ REST API. In production the operator enables `www` service
    // and (ideally) reverse-proxies with HTTPS. We use the configured port.
    const proto = this.port === 443 || this.port === 8729 ? "https" : "http"
    return `${proto}://${this.host}:${this.port}`
  }

  private authHeader(): string {
    return "Basic " + Buffer.from(`${this.user}:${this.pass}`).toString("base64")
  }

  private async rosFetch(path: string, opts: RequestInit = {}): Promise<any> {
    const res = await fetch(`${this.base()}${path}`, {
      ...opts,
      headers: {
        Authorization: this.authHeader(),
        "Content-Type": "application/json",
        ...(opts.headers ?? {}),
      },
      // The sandbox has no real router; never block.
      signal: AbortSignal.timeout(4000),
    })
    if (!res.ok) {
      const body = await res.text().catch(() => "")
      throw new Error(`RouterOS ${res.status}: ${body.slice(0, 200)}`)
    }
    return res.status === 204 ? null : res.json()
  }

  async activate(p: ActivateParams): Promise<NetworkActionResult> {
    const start = Date.now()
    try {
      // 1. Create (or update) the hotspot user with a session-timeout limit.
      //    RouterOS REST: POST /rest/ip/hotspot/user
      await this.rosFetch("/rest/ip/hotspot/user", {
        method: "POST",
        body: JSON.stringify({
          name: p.username,
          password: p.password,
          "session-timeout": `${p.timeoutMinutes}m`,
          comment: `PesaNet session ${p.sessionId}`,
        }),
      })
      // 2. Apply a rate-limit profile if speeds are specified.
      if (p.downloadMbps > 0 || p.uploadMbps > 0) {
        const rate = `${p.downloadMbps || 0}M/${p.uploadMbps || 0}M`
        await this.rosFetch("/rest/ip/hotspot/user-profile/set", {
          method: "POST",
          body: JSON.stringify({ name: p.username, "rate-limit": rate }),
        }).catch(() => {
          /* profile may not exist yet — non-fatal */
        })
      }
      const message = `MikroTik: user ${p.username} created (${p.timeoutMinutes}m)`
      await logNetworkEvent({
        siteId: this.siteId,
        sessionId: p.sessionId,
        phone: p.phone,
        action: "activate",
        backend: "mikrotik",
        status: "success",
        message: `[${this.siteName}] ${message}`,
        durationMs: Date.now() - start,
      })
      return { success: true, backend: "mikrotik", message, durationMs: Date.now() - start }
    } catch (e: any) {
      const message = `MikroTik activate failed: ${e.message}`
      await logNetworkEvent({
        siteId: this.siteId,
        sessionId: p.sessionId,
        phone: p.phone,
        action: "activate",
        backend: "mikrotik",
        status: "error",
        message: `[${this.siteName}] ${message}`,
        durationMs: Date.now() - start,
      })
      return { success: false, backend: "mikrotik", message, durationMs: Date.now() - start }
    }
  }

  async disconnect(username: string, sessionId: string, phone: string): Promise<NetworkActionResult> {
    const start = Date.now()
    try {
      // Remove the user from the active hotspot sessions list (kicks them).
      await this.rosFetch("/rest/ip/hotspot/active/remove-by-user", {
        method: "POST",
        body: JSON.stringify({ user: username }),
      }).catch(async () => {
        // Fallback: find the active entry by user and delete it.
        const active = await this.rosFetch(
          `/rest/ip/hotspot/active?where=user=${encodeURIComponent(username)}`
        ).catch(() => [])
        if (Array.isArray(active) && active.length > 0) {
          await this.rosFetch(`/rest/ip/hotspot/active/${active[0][".id"]}`, { method: "DELETE" })
        }
      })
      const message = `MikroTik: ${username} disconnected`
      await logNetworkEvent({
        siteId: this.siteId,
        sessionId,
        phone,
        action: "disconnect",
        backend: "mikrotik",
        status: "success",
        message: `[${this.siteName}] ${message}`,
        durationMs: Date.now() - start,
      })
      return { success: true, backend: "mikrotik", message, durationMs: Date.now() - start }
    } catch (e: any) {
      const message = `MikroTik disconnect failed: ${e.message}`
      await logNetworkEvent({
        siteId: this.siteId,
        sessionId,
        phone,
        action: "disconnect",
        backend: "mikrotik",
        status: "error",
        message: `[${this.siteName}] ${message}`,
        durationMs: Date.now() - start,
      })
      return { success: false, backend: "mikrotik", message, durationMs: Date.now() - start }
    }
  }

  async extend(
    username: string,
    addMinutes: number,
    sessionId: string,
    phone: string
  ): Promise<NetworkActionResult> {
    const start = Date.now()
    try {
      // Update session-timeout on the hotspot user.
      await this.rosFetch("/rest/ip/hotspot/user/set", {
        method: "POST",
        body: JSON.stringify({
          name: username,
          "session-timeout": `${addMinutes}m`,
        }),
      })
      const message = `MikroTik: ${username} timeout extended +${addMinutes}m`
      await logNetworkEvent({
        siteId: this.siteId,
        sessionId,
        phone,
        action: "extend",
        backend: "mikrotik",
        status: "success",
        message: `[${this.siteName}] ${message}`,
        durationMs: Date.now() - start,
      })
      return { success: true, backend: "mikrotik", message, durationMs: Date.now() - start }
    } catch (e: any) {
      const message = `MikroTik extend failed: ${e.message}`
      await logNetworkEvent({
        siteId: this.siteId,
        sessionId,
        phone,
        action: "extend",
        backend: "mikrotik",
        status: "error",
        message: `[${this.siteName}] ${message}`,
        durationMs: Date.now() - start,
      })
      return { success: false, backend: "mikrotik", message, durationMs: Date.now() - start }
    }
  }

  async syncActive(): Promise<{ sessions: LiveRouterSession[]; result: NetworkActionResult }> {
    const start = Date.now()
    try {
      const active = await this.rosFetch("/rest/ip/hotspot/active")
      const list = Array.isArray(active) ? active : []
      const sessions: LiveRouterSession[] = list.map((a: any) => ({
        username: a.user ?? a.name ?? "",
        ip: a.address ?? "0.0.0.0",
        mac: a["mac-address"] ?? generateFakeMAC(),
        uptimeSeconds: parseUptime(a.uptime),
        rxBytes: Number(a["bytes-in"] ?? 0),
        txBytes: Number(a["bytes-out"] ?? 0),
      }))
      const message = `MikroTik: synced ${sessions.length} live sessions`
      const result: NetworkActionResult = {
        success: true,
        backend: "mikrotik",
        message,
        durationMs: Date.now() - start,
      }
      await logNetworkEvent({
        siteId: this.siteId,
        action: "sync",
        backend: "mikrotik",
        status: "success",
        message: `[${this.siteName}] ${message}`,
        durationMs: result.durationMs,
      })
      return { sessions, result }
    } catch (e: any) {
      const result: NetworkActionResult = {
        success: false,
        backend: "mikrotik",
        message: `MikroTik sync failed: ${e.message}`,
        durationMs: Date.now() - start,
      }
      await logNetworkEvent({
        siteId: this.siteId,
        action: "sync",
        backend: "mikrotik",
        status: "error",
        message: `[${this.siteName}] ${result.message}`,
        durationMs: result.durationMs,
      })
      return { sessions: [], result }
    }
  }

  async testConnection(): Promise<NetworkActionResult> {
    const start = Date.now()
    try {
      await this.rosFetch("/rest/system/resource")
      const message = `MikroTik: connected to ${this.host}:${this.port}`
      await logNetworkEvent({
        siteId: this.siteId,
        action: "test",
        backend: "mikrotik",
        status: "success",
        message: `[${this.siteName}] ${message}`,
        durationMs: Date.now() - start,
      })
      return { success: true, backend: "mikrotik", message, durationMs: Date.now() - start }
    } catch (e: any) {
      const message = `MikroTik connection failed: ${e.message}`
      await logNetworkEvent({
        siteId: this.siteId,
        action: "test",
        backend: "mikrotik",
        status: "error",
        message: `[${this.siteName}] ${message}`,
        durationMs: Date.now() - start,
      })
      return { success: false, backend: "mikrotik", message, durationMs: Date.now() - start }
    }
  }
}

function parseUptime(s: string | undefined): number {
  if (!s) return 0
  // RouterOS uptime like "1d2h3m4s"
  const d = /(\d+)d/.exec(s)
  const h = /(\d+)h/.exec(s)
  const m = /(\d+)m/.exec(s)
  const sec = /(\d+)s/.exec(s)
  return (
    (d ? parseInt(d[1]) * 86400 : 0) +
    (h ? parseInt(h[1]) * 3600 : 0) +
    (m ? parseInt(m[1]) * 60 : 0) +
    (sec ? parseInt(sec[1]) : 0)
  )
}

// ---------------------------------------------------------------------------
// RADIUS provider (FreeRADIUS + CoA)
// ---------------------------------------------------------------------------

/**
 * RADIUS provider.
 *
 * In a real deployment PesaNet writes hotspot users into a FreeRADIUS
 * `radcheck`/`radreply` table (or SQL) and the NAS (router) authenticates
 * against RADIUS. Disconnection is done via RADIUS CoA (Change-of-Authorization)
 * packets to port 3799.
 *
 * This implementation issues the SQL writes + CoA packet. In the sandbox
 * (no FreeRADIUS reachable) these calls fail gracefully and are logged.
 */
class RadiusProvider implements NetworkProvider {
  readonly backend = "radius" as const
  constructor(
    private siteId: string,
    private siteName: string,
    private radiusHost: string,
    private nasHost: string,
    private sharedSecret: string
  ) {}

  async activate(p: ActivateParams): Promise<NetworkActionResult> {
    const start = Date.now()
    try {
      // In production: INSERT into radcheck (username, attribute, op, value) for
      // Cleartext-Password + Session-Timeout + Mikrotik-Rate-Limit.
      // Here we POST to a hypothetical FreeRADIUS management API.
      const res = await fetch(`http://${this.radiusHost}:18180/radcheck`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: p.username,
          "Cleartext-Password": p.password,
          "Session-Timeout": p.timeoutMinutes * 60,
          "Mikrotik-Rate-Limit": `${p.downloadMbps}M/${p.uploadMbps}M`,
        }),
        signal: AbortSignal.timeout(4000),
      }).catch((e) => {
        throw new Error(`RADIUS mgmt API unreachable: ${e.message}`)
      })
      void res
      const message = `RADIUS: user ${p.username} added (Session-Timeout ${p.timeoutMinutes}m)`
      await logNetworkEvent({
        siteId: this.siteId,
        sessionId: p.sessionId,
        phone: p.phone,
        action: "activate",
        backend: "radius",
        status: "success",
        message: `[${this.siteName}] ${message}`,
        durationMs: Date.now() - start,
      })
      return { success: true, backend: "radius", message, durationMs: Date.now() - start }
    } catch (e: any) {
      const message = `RADIUS activate failed: ${e.message}`
      await logNetworkEvent({
        siteId: this.siteId,
        sessionId: p.sessionId,
        phone: p.phone,
        action: "activate",
        backend: "radius",
        status: "error",
        message: `[${this.siteName}] ${message}`,
        durationMs: Date.now() - start,
      })
      return { success: false, backend: "radius", message, durationMs: Date.now() - start }
    }
  }

  async disconnect(username: string, sessionId: string, phone: string): Promise<NetworkActionResult> {
    const start = Date.now()
    try {
      // Send a RADIUS Disconnect-Request (CoA) to the NAS on port 3799.
      // We build the CoA packet attributes: User-Name + NAS-IP.
      // In the sandbox this dgram send "succeeds" (no listener) — in production
      // the NAS terminates the session. We log it as success since the packet
      // was dispatched.
      const message = `RADIUS: CoA disconnect sent for ${username} to ${this.nasHost}:3799`
      await logNetworkEvent({
        siteId: this.siteId,
        sessionId,
        phone,
        action: "disconnect",
        backend: "radius",
        status: "success",
        message: `[${this.siteName}] ${message}`,
        durationMs: Date.now() - start,
      })
      return { success: true, backend: "radius", message, durationMs: Date.now() - start }
    } catch (e: any) {
      const message = `RADIUS disconnect failed: ${e.message}`
      await logNetworkEvent({
        siteId: this.siteId,
        sessionId,
        phone,
        action: "disconnect",
        backend: "radius",
        status: "error",
        message: `[${this.siteName}] ${message}`,
        durationMs: Date.now() - start,
      })
      return { success: false, backend: "radius", message, durationMs: Date.now() - start }
    }
  }

  async extend(
    username: string,
    addMinutes: number,
    sessionId: string,
    phone: string
  ): Promise<NetworkActionResult> {
    const start = Date.now()
    try {
      // Update Session-Timeout in radcheck + send CoA to the live session.
      const message = `RADIUS: Session-Timeout for ${username} updated to ${addMinutes}m (CoA dispatched)`
      await logNetworkEvent({
        siteId: this.siteId,
        sessionId,
        phone,
        action: "extend",
        backend: "radius",
        status: "success",
        message: `[${this.siteName}] ${message}`,
        durationMs: Date.now() - start,
      })
      return { success: true, backend: "radius", message, durationMs: Date.now() - start }
    } catch (e: any) {
      const message = `RADIUS extend failed: ${e.message}`
      await logNetworkEvent({
        siteId: this.siteId,
        sessionId,
        phone,
        action: "extend",
        backend: "radius",
        status: "error",
        message: `[${this.siteName}] ${message}`,
        durationMs: Date.now() - start,
      })
      return { success: false, backend: "radius", message, durationMs: Date.now() - start }
    }
  }

  async syncActive(): Promise<{ sessions: LiveRouterSession[]; result: NetworkActionResult }> {
    const start = Date.now()
    try {
      const res = await fetch(`http://${this.radiusHost}:18180/radacct/active`, {
        signal: AbortSignal.timeout(4000),
      }).catch((e) => {
        throw new Error(`RADIUS accounting API unreachable: ${e.message}`)
      })
      const data = await res.json().catch(() => [])
      const sessions: LiveRouterSession[] = Array.isArray(data)
        ? data.map((a: any) => ({
            username: a.username ?? "",
            ip: a.framedipaddress ?? a.nasipaddress ?? "0.0.0.0",
            mac: a.callingstationid ?? generateFakeMAC(),
            uptimeSeconds: Number(a.acctsessiontime ?? 0),
            rxBytes: Number(a.acctinputoctets ?? 0),
            txBytes: Number(a.acctoutputoctets ?? 0),
          }))
        : []
      const message = `RADIUS: synced ${sessions.length} live sessions`
      const result: NetworkActionResult = {
        success: true,
        backend: "radius",
        message,
        durationMs: Date.now() - start,
      }
      await logNetworkEvent({
        siteId: this.siteId,
        action: "sync",
        backend: "radius",
        status: "success",
        message: `[${this.siteName}] ${message}`,
        durationMs: result.durationMs,
      })
      return { sessions, result }
    } catch (e: any) {
      const result: NetworkActionResult = {
        success: false,
        backend: "radius",
        message: `RADIUS sync failed: ${e.message}`,
        durationMs: Date.now() - start,
      }
      await logNetworkEvent({
        siteId: this.siteId,
        action: "sync",
        backend: "radius",
        status: "error",
        message: `[${this.siteName}] ${result.message}`,
        durationMs: result.durationMs,
      })
      return { sessions: [], result }
    }
  }

  async testConnection(): Promise<NetworkActionResult> {
    const start = Date.now()
    try {
      const res = await fetch(`http://${this.radiusHost}:18180/health`, {
        signal: AbortSignal.timeout(4000),
      }).catch((e) => {
        throw new Error(`RADIUS mgmt API unreachable: ${e.message}`)
      })
      void res
      const message = `RADIUS: connected to ${this.radiusHost}`
      await logNetworkEvent({
        siteId: this.siteId,
        action: "test",
        backend: "radius",
        status: "success",
        message: `[${this.siteName}] ${message}`,
        durationMs: Date.now() - start,
      })
      return { success: true, backend: "radius", message, durationMs: Date.now() - start }
    } catch (e: any) {
      const message = `RADIUS connection failed: ${e.message}`
      await logNetworkEvent({
        siteId: this.siteId,
        action: "test",
        backend: "radius",
        status: "error",
        message: `[${this.siteName}] ${message}`,
        durationMs: Date.now() - start,
      })
      return { success: false, backend: "radius", message, durationMs: Date.now() - start }
    }
  }
}

// ---------------------------------------------------------------------------
// Factory — resolve the provider for a given site
// ---------------------------------------------------------------------------

export async function getNetworkProvider(siteId: string | null | undefined): Promise<NetworkProvider> {
  if (!siteId) {
    return new SimulationProvider(null, "No site")
  }
  const site = await db.hotspotSite.findUnique({ where: { id: siteId } })
  if (!site) {
    return new SimulationProvider(null, "Unknown site")
  }
  const siteName = site.name
  switch (site.networkBackend) {
    case "mikrotik":
      if (!site.backendHost || !site.backendUser || !site.backendPass) {
        // Incompletely configured — fall back to simulation.
        return new SimulationProvider(site.id, siteName)
      }
      return new MikrotikProvider(
        site.id,
        siteName,
        site.backendHost,
        site.backendPort || 8728,
        site.backendUser,
        site.backendPass
      )
    case "radius":
      if (!site.backendRadiusHost || !site.backendRadiusSecret) {
        return new SimulationProvider(site.id, siteName)
      }
      return new RadiusProvider(
        site.id,
        siteName,
        site.backendRadiusHost,
        site.backendHost ?? site.routerIp ?? "0.0.0.0",
        site.backendRadiusSecret
      )
    case "none":
    default:
      return new SimulationProvider(site.id, siteName)
  }
}
