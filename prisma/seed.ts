import { PrismaClient } from "@prisma/client";

// Inlined helpers (src/lib/wifi-utils isn't available in standalone builds)
function generateVoucherCode(): string {
  const part = () => Math.floor(1000 + Math.random() * 9000).toString();
  return `WFI-${part()}-${part()}`;
}
function generateMpesaRef(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ0123456789";
  let ref = "";
  for (let i = 0; i < 10; i++) ref += chars[Math.floor(Math.random() * chars.length)];
  return ref;
}
function generateFakeIP(): string {
  return `10.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${1 + Math.floor(Math.random() * 254)}`;
}
function generateFakeMAC(): string {
  const hex = "0123456789ABCDEF";
  const parts: string[] = [];
  for (let i = 0; i < 6; i++) {
    let part = "";
    for (let j = 0; j < 2; j++) part += hex[Math.floor(Math.random() * 16)];
    parts.push(part);
  }
  return parts.join(":");
}

const db = new PrismaClient();

const PACKAGES = [
  {
    name: "Quick 30",
    priceKES: 10,
    durationMinutes: 30,
    dataLimitMB: 200,
    downloadSpeedMbps: 5,
    uploadSpeedMbps: 2,
    description: "Perfect for a quick WhatsApp or browse session.",
    popular: false,
  },
  {
    name: "Hourly Boost",
    priceKES: 25,
    durationMinutes: 60,
    dataLimitMB: 500,
    downloadSpeedMbps: 8,
    uploadSpeedMbps: 4,
    description: "One solid hour of streaming and social media.",
    popular: true,
  },
  {
    name: "3-Hour Surf",
    priceKES: 50,
    durationMinutes: 180,
    dataLimitMB: 1500,
    downloadSpeedMbps: 10,
    uploadSpeedMbps: 5,
    description: "Great value for study, work and video calls.",
    popular: true,
  },
  {
    name: "Daily Lite",
    priceKES: 99,
    durationMinutes: 1440,
    dataLimitMB: 3000,
    downloadSpeedMbps: 10,
    uploadSpeedMbps: 5,
    description: "A full day of connectivity for the casual user.",
    popular: false,
  },
  {
    name: "Daily Pro",
    priceKES: 199,
    durationMinutes: 1440,
    dataLimitMB: 0,
    downloadSpeedMbps: 20,
    uploadSpeedMbps: 10,
    description: "Unlimited data, full day, fibre-like speeds.",
    popular: true,
  },
  {
    name: "Weekly Unlimited",
    priceKES: 999,
    durationMinutes: 10080,
    dataLimitMB: 0,
    downloadSpeedMbps: 20,
    uploadSpeedMbps: 10,
    description: "Seven days of unlimited browsing and streaming.",
    popular: false,
  },
  {
    name: "Monthly Max",
    priceKES: 2999,
    durationMinutes: 43200,
    dataLimitMB: 0,
    downloadSpeedMbps: 40,
    uploadSpeedMbps: 20,
    description: "A full month of premium unlimited internet.",
    popular: false,
  },
];

const KENYAN_NAMES = [
  "Wanjiru Kamau",
  "Brian Otieno",
  "Aisha Mohammed",
  "Mercy Cherono",
  "Kevin Mwangi",
  "Faith Wanjiku",
  "Dennis Kiprotich",
  "Grace Njeri",
  "Samuel Mutua",
  "Joyce Achieng",
  "Peter Omondi",
  "Esther Nyambura",
];

function kePhone(i: number) {
  return `254712345${(100 + i).toString().padStart(3, "0")}`;
}

async function main() {
  console.log("Seeding database...");

  // Admin user (password: admin123 — stored as plain hash for demo only)
  await db.adminUser.upsert({
    where: { username: "admin" },
    update: {},
    create: {
      username: "admin",
      passwordHash: "admin123",
      name: "Site Administrator",
    },
  });

  // Packages
  const packages = [];
  for (const p of PACKAGES) {
    const pkg = await db.package.create({ data: p });
    packages.push(pkg);
  }
  console.log(`Created ${packages.length} packages`);

  // Customers
  const customers = [];
  for (let i = 0; i < KENYAN_NAMES.length; i++) {
    const c = await db.customer.create({
      data: { phone: kePhone(i), name: KENYAN_NAMES[i] },
    });
    customers.push(c);
  }

  // Historical sessions + transactions over the last 10 days
  const now = Date.now();
  let sessionCount = 0;
  let revenue = 0;
  for (let day = 9; day >= 0; day--) {
    const sessionsPerDay = 6 + Math.floor(Math.random() * 10);
    for (let s = 0; s < sessionsPerDay; s++) {
      const pkg = packages[Math.floor(Math.random() * packages.length)];
      const customer = customers[Math.floor(Math.random() * customers.length)];
      const startMs = now - day * 86400000 - Math.floor(Math.random() * 86400000);
      const startTime = new Date(startMs);
      const endTime = new Date(startMs + pkg.durationMinutes * 60000);
      const isToday = day === 0;
      const stillActive = isToday && Math.random() < 0.35;
      const status = stillActive
        ? "active"
        : Math.random() < 0.1
        ? "disconnected"
        : "expired";
      const mpesaRef = generateMpesaRef();

      await db.transaction.create({
        data: {
          customerId: customer.id,
          phone: customer.phone,
          amountKES: pkg.priceKES,
          packageId: pkg.id,
          packageName: pkg.name,
          method: "mpesa",
          mpesaRef,
          status: "completed",
          createdAt: startTime,
        },
      });

      await db.session.create({
        data: {
          customerId: customer.id,
          packageId: pkg.id,
          phone: customer.phone,
          packageName: pkg.name,
          priceKES: pkg.priceKES,
          startTime,
          endTime,
          durationMinutes: pkg.durationMinutes,
          status,
          dataUsedMB: Math.floor(Math.random() * (pkg.dataLimitMB || 2000)),
          ipAddress: generateFakeIP(),
          macAddress: generateFakeMAC(),
          authMethod: "mpesa",
          mpesaRef,
        },
      });

      sessionCount++;
      revenue += pkg.priceKES;
    }
  }
  console.log(`Created ${sessionCount} sessions, KES ${revenue} revenue`);

  // Vouchers — a batch for the popular packages
  const voucherBatchId = "BATCH-001";
  for (const pkg of packages.filter((p) => p.popular)) {
    for (let v = 0; v < 4; v++) {
      await db.voucher.create({
        data: {
          code: generateVoucherCode(),
          packageId: pkg.id,
          packageName: pkg.name,
          priceKES: pkg.priceKES,
          status: "unused",
          batchId: voucherBatchId,
        },
      });
    }
  }
  // A couple of used vouchers
  const usedPkg = packages[1];
  for (let v = 0; v < 2; v++) {
    await db.voucher.create({
      data: {
        code: generateVoucherCode(),
        packageId: usedPkg.id,
        packageName: usedPkg.name,
        priceKES: usedPkg.priceKES,
        status: "used",
        batchId: "BATCH-001",
        usedBy: kePhone(v),
        usedAt: new Date(now - (v + 1) * 3600000),
      },
    });
  }

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
