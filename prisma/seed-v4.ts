import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

const BLACKLIST = [
  { phone: "254700000001", reason: "Chargeback fraud — disputed 3 valid M-Pesa payments" },
  { phone: "254700000002", reason: "Voucher code tampering attempt detected" },
];

// Tier thresholds by lifetime points
function tierForPoints(pts: number): string {
  if (pts >= 5000) return "platinum";
  if (pts >= 2000) return "gold";
  if (pts >= 500) return "silver";
  return "bronze";
}

function genReferralCode(name?: string | null): string {
  const base = (name ?? "PE").replace(/[^A-Za-z]/g, "").slice(0, 4).toUpperCase() || "PE";
  const num = Math.floor(1000 + Math.random() * 9000);
  return `${base}${num}`;
}

async function main() {
  console.log("Seeding v4 feature data (loyalty, referrals, routers, blacklist, subs)...");

  // 1. Assign referral codes + compute points/tiers from completed transactions.
  const customers = await db.customer.findMany();
  const txs = await db.transaction.findMany({ where: { status: "completed" } });
  // points = 1 point per KES spent
  const spentByCustomer = new Map<string, number>();
  for (const t of txs) {
    if (!t.customerId) continue;
    spentByCustomer.set(t.customerId, (spentByCustomer.get(t.customerId) ?? 0) + t.amountKES);
  }
  let loyaltyUpdated = 0;
  for (const c of customers) {
    const spent = spentByCustomer.get(c.id) ?? 0;
    const points = spent; // 1 point per KES
    const tier = tierForPoints(points);
    const code = c.referralCode ?? genReferralCode(c.name);
    await db.customer.update({
      where: { id: c.id },
      data: {
        pointsBalance: points,
        lifetimePoints: points,
        tier,
        referralCode: code,
      },
    });
    loyaltyUpdated++;
  }
  console.log(`Updated loyalty for ${loyaltyUpdated} customers`);

  // 2. Router statuses for each site (simulated metrics)
  const sites = await db.hotspotSite.findMany();
  for (const site of sites) {
    const existing = await db.routerStatus.findUnique({ where: { siteId: site.id } });
    if (existing) continue;
    const isMaintenance = site.status === "maintenance";
    const activeSessions = await db.session.count({
      where: { siteId: site.id, status: "active" },
    });
    await db.routerStatus.create({
      data: {
        siteId: site.id,
        status: isMaintenance ? "offline" : activeSessions > site.maxUsers * 0.8 ? "warning" : "online",
        uptimeSeconds: isMaintenance ? 0 : Math.floor(86400 + Math.random() * 86400 * 30),
        connectedDevices: isMaintenance ? 0 : activeSessions + Math.floor(Math.random() * 10),
        bandwidthInMbps: isMaintenance ? 0 : Math.round((20 + Math.random() * 80) * 10) / 10,
        bandwidthOutMbps: isMaintenance ? 0 : Math.round((10 + Math.random() * 40) * 10) / 10,
        cpuUsage: isMaintenance ? 0 : Math.round((15 + Math.random() * 50) * 10) / 10,
        memoryUsage: isMaintenance ? 0 : Math.round((30 + Math.random() * 40) * 10) / 10,
      },
    });
  }
  console.log(`Ensured router statuses for ${sites.length} sites`);

  // 3. A few completed referrals (referrer earned points)
  const topCustomers = [...customers]
    .sort((a, b) => (spentByCustomer.get(b.id) ?? 0) - (spentByCustomer.get(a.id) ?? 0))
    .slice(0, 6);
  const referralPairs = [
    [0, 3],
    [1, 4],
    [2, 5],
  ];
  let referralsCreated = 0;
  for (const [i, j] of referralPairs) {
    const referrer = topCustomers[i];
    const referred = topCustomers[j];
    if (!referrer || !referred || referrer.id === referred.id) continue;
    const existing = await db.referral.findFirst({ where: { referredCustomerId: referred.id } });
    if (existing) continue;
    const reward = 100;
    await db.referral.create({
      data: {
        referrerCustomerId: referrer.id,
        referredCustomerId: referred.id,
        referredPhone: referred.phone,
        status: "completed",
        rewardPoints: reward,
        completedAt: new Date(Date.now() - Math.random() * 5 * 86400000),
        createdAt: new Date(Date.now() - 8 * 86400000),
      },
    });
    await db.customer.update({
      where: { id: referrer.id },
      data: {
        pointsBalance: { increment: reward },
        lifetimePoints: { increment: reward },
      },
    });
    await db.pointsTransaction.create({
      data: {
        customerId: referrer.id,
        points: reward,
        type: "earn_referral",
        reason: `Referral: ${referred.phone} joined & purchased`,
      },
    });
    referralsCreated++;
  }
  console.log(`Created ${referralsCreated} completed referrals`);

  // 4. Backfill points ledger for past purchases (one earn per customer, approximate)
  for (const c of customers) {
    const spent = spentByCustomer.get(c.id) ?? 0;
    if (spent <= 0) continue;
    const hasLedger = await db.pointsTransaction.findFirst({
      where: { customerId: c.id, type: "earn_purchase" },
    });
    if (hasLedger) continue;
    await db.pointsTransaction.create({
      data: {
        customerId: c.id,
        points: spent,
        type: "earn_purchase",
        reason: "Points earned from past purchases",
      },
    });
  }
  console.log("Backfilled purchase points ledger");

  // 5. Blacklist entries
  for (const b of BLACKLIST) {
    const existing = await db.blacklist.findUnique({ where: { phone: b.phone } });
    if (!existing) await db.blacklist.create({ data: b });
  }
  console.log(`Ensured ${BLACKLIST.length} blacklist entries`);

  // 6. A couple of active subscriptions
  const packages = await db.package.findMany({ where: { active: true } });
  const subCandidates = topCustomers.slice(0, 2);
  const dailyPro = packages.find((p) => p.name === "Daily Pro");
  const weekly = packages.find((p) => p.name === "Weekly Unlimited");
  let subsCreated = 0;
  for (let i = 0; i < subCandidates.length; i++) {
    const c = subCandidates[i];
    const pkg = i === 0 ? dailyPro : weekly;
    if (!c || !pkg) continue;
    const existing = await db.subscription.findFirst({
      where: { customerId: c.id, status: "active" },
    });
    if (existing) continue;
    const cycleMs = pkg.durationMinutes * 60000;
    await db.subscription.create({
      data: {
        customerId: c.id,
        phone: c.phone,
        packageId: pkg.id,
        packageName: pkg.name,
        priceKES: pkg.priceKES,
        status: "active",
        nextChargeAt: new Date(Date.now() + cycleMs),
        lastChargedAt: new Date(Date.now() - 3600000),
      },
    });
    subsCreated++;
  }
  console.log(`Created ${subsCreated} active subscriptions`);

  console.log("V4 feature seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
