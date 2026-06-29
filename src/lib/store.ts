"use client"

import { create } from "zustand"

export type AppView = "customer" | "admin"
export type AdminSection =
  | "overview"
  | "sessions"
  | "packages"
  | "vouchers"
  | "transactions"
  | "customers"

interface AppState {
  view: AppView
  adminAuthed: boolean
  adminName: string | null
  adminSection: AdminSection
  setView: (view: AppView) => void
  setAdminAuthed: (authed: boolean, name?: string | null) => void
  setAdminSection: (section: AdminSection) => void
}

export const useAppStore = create<AppState>((set) => ({
  view: "customer",
  adminAuthed: false,
  adminName: null,
  adminSection: "overview",
  setView: (view) => set({ view }),
  setAdminAuthed: (authed, name = null) =>
    set({ adminAuthed: authed, adminName: name }),
  setAdminSection: (adminSection) => set({ adminSection }),
}))
