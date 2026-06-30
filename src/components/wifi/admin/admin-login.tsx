"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Eye, EyeOff, Lock, ShieldCheck, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAppStore } from "@/lib/store"
import { useToast } from "@/hooks/use-toast"

export function AdminLogin() {
  const { toast } = useToast()
  const setAdminAuthed = useAppStore((s) => s.setAdminAuthed)
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!username.trim() || !password) {
      toast({
        title: "Missing credentials",
        description: "Enter your username and password.",
        variant: "destructive",
      })
      return
    }
    setLoading(true)
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), password }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Login failed")
      }
      setAdminAuthed(true, data.name ?? username.trim())
      toast({
        title: "Welcome back",
        description: `Signed in as ${data.name ?? username.trim()}.`,
      })
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Login failed"
      toast({
        title: "Login failed",
        description: msg,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto grid min-h-[70vh] w-full max-w-md place-items-center px-4 py-10">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full"
      >
        <Card className="overflow-hidden py-0">
          <div className="bg-gradient-to-r from-primary to-emerald-600 px-6 py-6 text-primary-foreground">
            <div className="flex items-center gap-3">
              <div className="grid size-10 place-items-center rounded-lg bg-white/15">
                <ShieldCheck className="size-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold">PesaNet Admin</h2>
                <p className="text-xs text-primary-foreground/90">
                  Sign in to manage the WiFi billing system
                </p>
              </div>
            </div>
          </div>

          <CardHeader>
            <CardTitle>Sign in</CardTitle>
            <CardDescription>
              Use your administrator credentials to continue.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={submit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="admin-username">Username</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="admin-username"
                    placeholder="admin"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="pl-9"
                    autoComplete="username"
                  />
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="admin-password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="admin-password"
                    type={show ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-9 pr-9"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShow((s) => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label={show ? "Hide password" : "Show password"}
                  >
                    {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>

              <Button type="submit" disabled={loading} size="lg">
                {loading ? "Signing in…" : "Sign in"}
              </Button>

              <p className="text-center text-xs text-muted-foreground">
                Demo credentials: <span className="font-mono">admin</span> /{" "}
                <span className="font-mono">admin123</span>
              </p>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
