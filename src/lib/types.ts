// Shared types for the WiFi billing system.
// These mirror the Prisma models and the API response contracts.

export interface WifiPackage {
  id: string
  name: string
  priceKES: number
  durationMinutes: number
  dataLimitMB: number // 0 = unlimited
  downloadSpeedMbps: number
  uploadSpeedMbps: number
  description: string
  popular: boolean
  active: boolean
  createdAt: string
}

export interface WifiSession {
  id: string
  phone: string
  packageName: string
  priceKES: number
  startTime: string
  endTime: string
  durationMinutes: number
  status: string // active, expired, disconnected
  dataUsedMB: number
  ipAddress: string | null
  macAddress: string | null
  authMethod: string // mpesa, voucher
  mpesaRef: string | null
  customer?: { name: string | null } | null
}

export interface WifiVoucher {
  id: string
  code: string
  packageName: string
  priceKES: number
  status: string // unused, used, expired
  usedBy: string | null
  usedAt: string | null
  createdAt: string
}

export interface WifiTransaction {
  id: string
  phone: string
  amountKES: number
  packageName: string | null
  method: string // mpesa, voucher
  mpesaRef: string | null
  status: string // pending, completed, failed
  createdAt: string
}

export interface AdminStats {
  activeSessions: number
  todayRevenue: number
  totalRevenue: number
  totalCustomers: number
  todaySessions: number
  vouchersUnused: number
  packagesActive: number
}

export interface RevenuePoint {
  date: string
  revenue: number
  sessions: number
}

export interface AdminCustomer {
  id: string
  phone: string
  name: string | null
  createdAt: string
  totalSpent: number
  sessionCount: number
  lastActive: string | null
}
