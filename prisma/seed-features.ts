import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

const SETTING_SEED: Record<string, string> = {
  businessName: "PesaNet WiFi",
  paybillNumber: "247247",
  accountReference: "PESANET",
  supportPhone: "0712345678",
  supportEmail: "support@pesanet.co.ke",
  supportHours: "8:00 AM - 9:00 PM EAT",
  mpesaEnabled: "true",
  voucherEnabled: "true",
  resellerEnabled: "true",
  defaultCommissionRate: "10",
  notificationPhone: "0712345678",
  currency: "KES",
  timezone: "Africa/Nairobi",
};

const RESELLERS = [
  {
    phone: "254722111111",
    name: "Joseph Kariuki",
    businessName: "Kariuki Cyber & M-Pesa",
    location: "Nairobi CBD",
    commissionRate: 12,
  },
  {
    phone: "254722222222",
    name: "Halima Hassan",
    businessName: "Coast Connect Shop",
    location: "Mombasa",
    commissionRate: 10,
  },
  {
    phone: "254722333333",
    name: "Patrick Owino",
    businessName: "Owino Electronics",
    location: "Kisumu",
    commissionRate: 8,
  },
  {
    phone: "254722444444",
    name: "Grace Wambui",
    businessName: "Wambui Mini Mart",
    location: "Nakuru",
    commissionRate: 10,
  },
];

const PROMO_CODES = [
  {
    code: "WELCOME10",
    description: "10% off your first purchase",
    discountType: "percent",
    discountValue: 10,
    maxUses: 100,
  },
  {
    code: "FLAT50",
    description: "KES 50 off any package",
    discountType: "fixed",
    discountValue: 50,
    maxUses: 50,
  },
  {
    code: "FIJABIASHARA",
    description: "Kijiji biashara promo — 15% off",
    discountType: "percent",
    discountValue: 15,
    maxUses: 200,
  },
  {
    code: "NIGHTOWL",
    description: "20% off evening browsing",
    discountType: "percent",
    discountValue: 20,
    maxUses: 0, // unlimited
  },
];

const TICKETS = [
  {
    phone: "254712345678",
    customerName: "Wanjiru Kamau",
    subject: "Session disconnected unexpectedly",
    message:
      "I bought the Hourly Boost package but my connection dropped after 20 minutes. Please assist.",
    category: "connectivity",
    priority: "high",
    status: "in_progress",
    adminReply: "We are checking the router logs near your area. Will revert shortly.",
  },
  {
    phone: "254712345107",
    customerName: "Mercy Cherono",
    subject: "Voucher code not working",
    message: "I tried redeeming WFI-XXXX-XXXX but it says invalid. I paid for it at a shop.",
    category: "voucher",
    priority: "normal",
    status: "open",
  },
  {
    phone: "254712345111",
    customerName: "Esther Nyambura",
    subject: "M-Pesa payment deducted but no session",
    message:
      "Money was deducted from my M-Pesa but I did not receive a confirmation or session.",
    category: "billing",
    priority: "urgent",
    status: "resolved",
    adminReply:
      "We located your payment (ref ABC123) and credited a Daily Pro session to your line. Apologies for the inconvenience.",
  },
  {
    phone: "254712345101",
    customerName: "Brian Otieno",
    subject: "Slow speeds on Daily Pro",
    message: "The speed is much lower than the 20 Mbps advertised. Getting around 3 Mbps.",
    category: "connectivity",
    priority: "normal",
    status: "open",
  },
  {
    phone: "254712345105",
    customerName: "Faith Wanjiku",
    subject: "Request for weekly package",
    message: "Do you have a weekly unlimited option under KES 1000?",
    category: "general",
    priority: "low",
    status: "closed",
    adminReply:
      "Yes! Our Weekly Unlimited package is KES 999. Check the packages page for details.",
  },
];

async function main() {
  console.log("Seeding new feature data...");

  // Settings (upsert each)
  for (const [key, value] of Object.entries(SETTING_SEED)) {
    await db.setting.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });
  }
  console.log(`Upserted ${Object.keys(SETTING_SEED).length} settings`);

  // Resellers
  for (const r of RESELLERS) {
    const exists = await db.reseller.findUnique({ where: { phone: r.phone } });
    if (!exists) {
      // Give them some wallet balance and history
      const balance = 2000 + Math.floor(Math.random() * 3000);
      const earned = 5000 + Math.floor(Math.random() * 8000);
      const sales = 30000 + Math.floor(Math.random() * 60000);
      await db.reseller.create({
        data: {
          ...r,
          walletBalanceKES: balance,
          totalEarnedKES: earned,
          totalSalesKES: sales,
        },
      });
    }
  }
  console.log(`Ensured ${RESELLERS.length} resellers`);

  // Promo codes
  for (const p of PROMO_CODES) {
    const exists = await db.promoCode.findUnique({ where: { code: p.code } });
    if (!exists) {
      await db.promoCode.create({
        data: {
          ...p,
          active: true,
          usesCount: Math.floor(Math.random() * 20),
          expiresAt: new Date(Date.now() + 30 * 86400000),
        },
      });
    }
  }
  console.log(`Ensured ${PROMO_CODES.length} promo codes`);

  // Support tickets — link to existing customers where possible
  const customers = await db.customer.findMany();
  for (let i = 0; i < TICKETS.length; i++) {
    const t = TICKETS[i];
    const existing = await db.supportTicket.findFirst({
      where: { phone: t.phone, subject: t.subject },
    });
    if (existing) continue;
    const matchedCustomer = customers.find((c) => c.phone === t.phone);
    await db.supportTicket.create({
      data: {
        ...t,
        customerId: matchedCustomer?.id ?? null,
        createdAt: new Date(Date.now() - (i + 1) * 7200000),
      },
    });
  }
  console.log(`Ensured ${TICKETS.length} support tickets`);

  console.log("Feature seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
