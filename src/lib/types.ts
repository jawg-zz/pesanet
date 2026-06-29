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
  promoCode: string | null
  discountKES: number
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
  resellerId: string | null
  createdAt: string
}

export interface WifiTransaction {
  id: string
  phone: string
  amountKES: number
  packageName: string | null
  method: string // mpesa, voucher, reseller
  mpesaRef: string | null
  status: string // pending, completed, failed
  promoCode: string | null
  discountKES: number
  resellerId: string | null
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
  openTickets: number
  activeResellers: number
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

// --- New feature types ---

export interface Reseller {
  id: string
  phone: string
  name: string
  businessName: string | null
  location: string | null
  commissionRate: number
  walletBalanceKES: number
  totalEarnedKES: number
  totalSalesKES: number
  status: string // active, suspended
  createdAt: string
}

export interface ResellerStats {
  walletBalanceKES: number
  totalEarnedKES: number
  totalSalesKES: number
  commissionRate: number
  vouchersSold: number
  vouchersUnsold: number
  recentSales: WifiTransaction[]
  recentVouchers: WifiVoucher[]
}

export interface PromoCode {
  id: string
  code: string
  description: string
  discountType: string // percent, fixed
  discountValue: number
  active: boolean
  usesCount: number
  maxUses: number // 0 = unlimited
  expiresAt: string | null
  createdAt: string
}

export interface SupportTicket {
  id: string
  phone: string
  customerName: string | null
  subject: string
  message: string
  category: string
  priority: string // low, normal, high, urgent
  status: string // open, in_progress, resolved, closed
  adminReply: string | null
  createdAt: string
  updatedAt: string
}

export interface CustomerAccount {
  id: string
  phone: string
  name: string | null
  email: string | null
  location: string | null
  createdAt: string
  totalSpent: number
  sessionCount: number
  activeSessions: WifiSession[]
  recentSessions: WifiSession[]
  recentTransactions: WifiTransaction[]
  tickets: SupportTicket[]
}

export interface BusinessSettings {
  [key: string]: string
}

export interface DiscountPreview {
  valid: boolean
  discountKES: number
  finalAmountKES: number
  message: string
}
