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
  siteId: string | null
  siteName: string | null
  extended: boolean
  hasFeedback: boolean
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
  activeAnnouncements: number
  avgRating: number
  totalFeedback: number
  activeSubscriptions: number
  pointsCirculation: number
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

// --- v3 feature types ---

export interface HotspotSite {
  id: string
  name: string
  location: string
  routerIp: string | null
  maxUsers: number
  status: string // active, inactive, maintenance
  networkBackend: string // none, mikrotik, radius
  backendHost: string | null
  backendPort: number
  backendUser: string | null
  backendRadiusHost: string | null
  createdAt: string
  activeSessions: number
  totalSessions: number
}

export interface Announcement {
  id: string
  title: string
  message: string
  type: string // info, warning, maintenance, promo
  active: boolean
  expiresAt: string | null
  createdAt: string
}

export interface Feedback {
  id: string
  sessionId: string
  phone: string
  rating: number // 1..5
  comment: string | null
  packageName: string | null
  createdAt: string
}

export interface AnalyticsData {
  packagePopularity: { packageName: string; count: number; revenue: number }[]
  peakHours: { hour: string; sessions: number }[]
  siteBreakdown: { siteName: string; sessions: number; revenue: number }[]
  ratingDistribution: { rating: number; count: number }[]
}

// --- Round 4 feature types ---

export interface LoyaltySummary {
  customerId: string
  phone: string
  name: string | null
  pointsBalance: number
  lifetimePoints: number
  tier: string // bronze, silver, gold, platinum
  referralCode: string | null
  referralsCount: number
  referralsCompleted: number
  nextTier: string | null
  pointsToNextTier: number
}

export interface PointsLedgerEntry {
  id: string
  points: number // + earn, - redeem
  type: string // earn_purchase, earn_referral, redeem_voucher, admin_adjust
  reason: string
  createdAt: string
}

export interface ReferralEntry {
  id: string
  referredPhone: string
  referredName: string | null
  status: string // pending, completed
  rewardPoints: number
  createdAt: string
  completedAt: string | null
}

export interface RedeemOption {
  packageId: string
  packageName: string
  priceKES: number
  pointsCost: number
  affordable: boolean
}

export interface SmsBroadcast {
  id: string
  message: string
  audience: string
  audienceFilter: string
  recipientCount: number
  status: string
  createdAt: string
}

export interface RouterHealth {
  id: string
  siteId: string
  siteName: string
  location: string
  status: string // online, warning, offline
  uptimeSeconds: number
  connectedDevices: number
  maxUsers: number
  bandwidthInMbps: number
  bandwidthOutMbps: number
  cpuUsage: number
  memoryUsage: number
  updatedAt: string
}

export interface BlacklistEntry {
  id: string
  phone: string
  reason: string
  createdAt: string
}

export interface SubscriptionEntry {
  id: string
  phone: string
  packageName: string
  priceKES: number
  status: string // active, paused, cancelled
  nextChargeAt: string
  lastChargedAt: string | null
  customerName: string | null
  createdAt: string
}

// --- Network backend types ---

export type NetworkBackend = "none" | "mikrotik" | "radius"

export interface NetworkEventEntry {
  id: string
  siteId: string | null
  siteName: string | null
  sessionId: string | null
  phone: string | null
  action: string // activate, disconnect, extend, sync, test, error
  backend: string // mikrotik, radius, simulation
  status: string // success, error
  message: string
  durationMs: number
  createdAt: string
}

export interface NetworkActionResult {
  success: boolean
  backend: string
  message: string
  durationMs: number
}

export interface LiveRouterSession {
  username: string
  ip: string
  mac: string
  uptimeSeconds: number
  rxBytes: number
  txBytes: number
}
