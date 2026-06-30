"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import {
  Activity,
  Loader2,
  Plug,
  PlugZap,
  RefreshCw,
  Router as RouterIcon,
  Server,
  ShieldCheck,
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
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import type { HotspotSite, NetworkEventEntry } from "@/lib/types"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"

/**
 * Network backend configuration + connection testing + live sync + audit log.
 * Lets the admin choose MikroTik / RADIUS / simulation per site and see every
 * network operation that PesaNet has dispatched.
 */
export function NetworkBackendPanel() {
  const { toast } = useToast()
  const [sites, setSites] = useState<HotspotSite[]>([])
  const [events, setEvents] = useState<NetworkEventEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [configSite, setConfigSite] = useState<HotspotSite | null>(null)
  const [testing, setTesting] = useState<string | null>(null)
  const [syncing, setSyncing] = useState<string | null>(null)

  async function load() {
    try {
      const [s, e] = await Promise.all([
        fetch("/api/sites").then((r) => r.json() as Promise<{ sites: HotspotSite[] }>),
        fetch("/api/network/events?limit=50").then(
          (r) => r.json() as Promise<{ events: NetworkEventEntry[] }>
        ),
      ])
      setSites(s.sites ?? [])
      setEvents(e.events ?? [])
    } catch {
      /* ignore */
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    const id = setInterval(load, 10000)
    return () => clearInterval(id)
  }, [])

  async function testConnection(site: HotspotSite) {
    setTesting(site.id)
    try {
      const res = await fetch(`/api/network/${site.id}/test`, { method: "POST" })
      const data = await res.json()
      toast({
        title: data.success ? "Connection OK" : "Connection failed",
        description: data.message,
        variant: data.success ? "default" : "destructive",
      })
      load()
    } catch {
      toast({ title: "Test failed", variant: "destructive" })
    } finally {
      setTesting(null)
    }
  }

  async function syncSessions(site: HotspotSite) {
    setSyncing(site.id)
    try {
      const res = await fetch(`/api/network/${site.id}/sync`, { method: "POST" })
      const data = await res.json()
      toast({
        title: data.result?.success ? "Sync complete" : "Sync failed",
        description: data.result?.message,
        variant: data.result?.success ? "default" : "destructive",
      })
      load()
    } catch {
      toast({ title: "Sync failed", variant: "destructive" })
    } finally {
      setSyncing(null)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-32 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    )
  }

  const configured = sites.filter((s) => s.networkBackend !== "none")

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="flex flex-col gap-5"
    >
      {/* Backend config per site */}
      <Card className="py-0">
        <CardHeader className="px-5 pt-5">
          <CardTitle className="flex items-center gap-2 text-base">
            <Server className="size-4 text-primary" />
            Network Backend Configuration
          </CardTitle>
          <CardDescription>
            Choose how PesaNet enforces connections at each site — MikroTik
            RouterOS, RADIUS (FreeRADIUS), or simulation mode.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 px-5 pb-5">
          {sites.map((site) => (
            <div
              key={site.id}
              className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex items-start gap-3">
                <div
                  className={cn(
                    "grid size-9 shrink-0 place-items-center rounded-lg",
                    site.networkBackend === "mikrotik"
                      ? "bg-amber-500/15 text-amber-600"
                      : site.networkBackend === "radius"
                      ? "bg-emerald-500/15 text-emerald-600"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {site.networkBackend === "mikrotik" ? (
                    <RouterIcon className="size-4" />
                  ) : site.networkBackend === "radius" ? (
                    <ShieldCheck className="size-4" />
                  ) : (
                    <Activity className="size-4" />
                  )}
                </div>
                <div>
                  <p className="font-medium leading-tight">{site.name}</p>
                  <p className="text-xs text-muted-foreground">{site.location}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    <BackendBadge backend={site.networkBackend} />
                    {site.backendHost && (
                      <Badge variant="outline" className="font-mono text-[10px]">
                        {site.backendHost}:{site.backendPort}
                      </Badge>
                    )}
                    {site.backendUser && (
                      <Badge variant="outline" className="text-[10px]">
                        user: {site.backendUser}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => testConnection(site)}
                  disabled={testing === site.id}
                >
                  {testing === site.id ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Plug className="size-3.5" />
                  )}
                  Test
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => syncSessions(site)}
                  disabled={syncing === site.id}
                >
                  {syncing === site.id ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <RefreshCw className="size-3.5" />
                  )}
                  Sync
                </Button>
                <Button size="sm" variant="outline" onClick={() => setConfigSite(site)}>
                  <PlugZap className="size-3.5" />
                  Configure
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Audit log */}
      <Card className="py-0">
        <CardHeader className="px-5 pt-5">
          <CardTitle className="flex items-center gap-2 text-base">
            <Activity className="size-4 text-primary" />
            Network Operations Log
          </CardTitle>
          <CardDescription>
            Audit trail of every activate / disconnect / extend / sync / test
            call dispatched to a network backend.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-2 pb-3">
          {events.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">
              No network operations yet. Make a purchase or test a connection.
            </p>
          ) : (
            <div className="max-h-96 overflow-y-auto custom-scroll">
              <ul className="flex flex-col">
                {events.map((e) => (
                  <li
                    key={e.id}
                    className="flex items-start gap-3 px-3 py-2.5 text-sm hover:bg-muted/40 border-b last:border-0"
                  >
                    <BackendBadge backend={e.backend} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{e.action}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {e.message}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge
                        variant="outline"
                        className={
                          e.status === "success"
                            ? "border-emerald-500/30 text-emerald-600"
                            : "border-red-500/30 text-red-600"
                        }
                      >
                        {e.status}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground">
                        {e._ago}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      {configSite && (
        <BackendConfigDialog
          site={configSite}
          onClose={() => setConfigSite(null)}
          onSaved={() => {
            setConfigSite(null)
            load()
          }}
        />
      )}
    </motion.div>
  )
}

function BackendBadge({ backend }: { backend: string }) {
  if (backend === "mikrotik")
    return (
      <Badge className="border-transparent bg-amber-500/15 text-amber-700 dark:text-amber-300">
        MikroTik
      </Badge>
    )
  if (backend === "radius")
    return (
      <Badge className="border-transparent bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
        RADIUS
      </Badge>
    )
  return (
    <Badge className="border-transparent bg-muted text-muted-foreground">
      Simulation
    </Badge>
  )
}

function BackendConfigDialog({
  site,
  onClose,
  onSaved,
}: {
  site: HotspotSite
  onClose: () => void
  onSaved: () => void
}) {
  const { toast } = useToast()
  const [saving, setSaving] = useState(false)
  const [backend, setBackend] = useState(site.networkBackend)
  const [host, setHost] = useState(site.backendHost ?? "")
  const [port, setPort] = useState(String(site.backendPort || 8728))
  const [user, setUser] = useState(site.backendUser ?? "")
  const [pass, setPass] = useState("")
  const [radiusHost, setRadiusHost] = useState(site.backendRadiusHost ?? "")
  const [radiusSecret, setRadiusSecret] = useState("")

  async function save() {
    setSaving(true)
    try {
      const body: Record<string, unknown> = {
        networkBackend: backend,
        backendHost: host || null,
        backendPort: Number(port) || 8728,
      }
      if (backend === "mikrotik") {
        body.backendUser = user || null
        if (pass) body.backendPass = pass
      }
      if (backend === "radius") {
        body.backendRadiusHost = radiusHost || null
        if (radiusSecret) body.backendRadiusSecret = radiusSecret
      }
      const res = await fetch(`/api/sites/${site.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error("Save failed")
      toast({ title: "Backend saved", description: `${site.name} updated.` })
      onSaved()
    } catch {
      toast({ title: "Save failed", variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Configure network backend</DialogTitle>
          <DialogDescription>{site.name} — {site.location}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs">Backend type</Label>
            <Select value={backend} onValueChange={setBackend}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Simulation (no real router)</SelectItem>
                <SelectItem value="mikrotik">MikroTik RouterOS API</SelectItem>
                <SelectItem value="radius">RADIUS (FreeRADIUS)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {backend !== "none" && (
            <>
              <Separator />
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <Label className="text-xs">
                    {backend === "mikrotik" ? "Router API host" : "NAS host"}
                  </Label>
                  <Input
                    value={host}
                    onChange={(e) => setHost(e.target.value)}
                    placeholder={backend === "mikrotik" ? "192.168.88.1" : "10.0.1.1"}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label className="text-xs">Port</Label>
                  <Input
                    value={port}
                    onChange={(e) => setPort(e.target.value)}
                    placeholder={backend === "mikrotik" ? "8728" : "3799"}
                  />
                </div>
              </div>
            </>
          )}

          {backend === "mikrotik" && (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <Label className="text-xs">API username</Label>
                  <Input
                    value={user}
                    onChange={(e) => setUser(e.target.value)}
                    placeholder="admin"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label className="text-xs">API password</Label>
                  <Input
                    type="password"
                    value={pass}
                    onChange={(e) => setPass(e.target.value)}
                    placeholder="Leave blank to keep existing"
                  />
                </div>
              </div>
              <p className="rounded-md bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
                Enable the <code className="font-mono">api</code> service on the
                MikroTik (IP &gt; Services) and create an API user with
                <code className="font-mono"> write,policy,test</code> permissions.
              </p>
            </>
          )}

          {backend === "radius" && (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <Label className="text-xs">FreeRADIUS server host</Label>
                  <Input
                    value={radiusHost}
                    onChange={(e) => setRadiusHost(e.target.value)}
                    placeholder="radius.pesanet.co.ke"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label className="text-xs">RADIUS shared secret</Label>
                  <Input
                    type="password"
                    value={radiusSecret}
                    onChange={(e) => setRadiusSecret(e.target.value)}
                    placeholder="Leave blank to keep existing"
                  />
                </div>
              </div>
              <p className="rounded-md bg-emerald-500/10 px-3 py-2 text-xs text-emerald-700 dark:text-emerald-300">
                PesaNet writes hotspot users to the FreeRADIUS <code className="font-mono">radcheck</code> table
                and sends CoA disconnects to port 3799 on the NAS.
              </p>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving && <Loader2 className="size-4 animate-spin" />}
            Save backend
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
