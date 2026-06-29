"use client"

import { create } from "zustand"

export type AppView = "customer" | "account" | "reseller" | "admin"
export type AdminSection =
  | "overview"
  | "sessions"
  | "packages"
  | "vouchers"
  | "transactions"
  | "customers"
  | "resellers"
  | "promos"
  | "tickets"
  | "reports"
  | "settings"
  | "sites"
  | "announcements"
  | "feedback"

interface AppState {
  view: AppView
  adminAuthed: boolean
  adminName: string | null
  adminSection: AdminSection
  resellerAuthed: boolean
  resellerPhone: string | null
  resellerName: string | null
  setView: (view: AppView) => void
  setAdminAuthed: (authed: boolean, name?: string | null) => void
  setAdminSection: (section: AdminSection) => void
  setResellerAuthed: (
    authed: boolean,
    phone?: string | null,
    name?: string | null
  ) => void
}

export const useAppStore = create<AppState>((set) => ({
  view: "customer",
  adminAuthed: false,
  adminName: null,
  adminSection: "overview",
  resellerAuthed: false,
  resellerPhone: null,
  resellerName: null,
  setView: (view) => set({ view }),
  setAdminAuthed: (authed, name = null) =>
    set({ adminAuthed: authed, adminName: name }),
  setAdminSection: (adminSection) => set({ adminSection }),
  setResellerAuthed: (authed, phone = null, name = null) =>
    set({ resellerAuthed: authed, resellerPhone: phone, resellerName: name }),
}))
