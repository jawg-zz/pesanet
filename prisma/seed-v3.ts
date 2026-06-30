import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

const SITES = [
  {
    name: "Nairobi CBD — Moi Avenue",
    location: "Nairobi CBD, Moi Avenue",
    routerIp: "10.0.1.1",
    maxUsers: 80,
    status: "active",
  },
  {
    name: "Westlands Mall",
    location: "Westlands, Sarit Centre",
    routerIp: "10.0.2.1",
    maxUsers: 120,
    status: "active",
  },
  {
    name: "Mombasa — Nyali",
    location: "Mombasa, Nyali Road",
    routerIp: "10.0.3.1",
    maxUsers: 60,
    status: "active",
  },
  {
    name: "Kisumu Town Centre",
    location: "Kisumu, Otieno Oyoo Street",
    routerIp: "10.0.4.1",
    maxUsers: 40,
    status: "maintenance",
  },
  {
    name: "Eldoret — Rupa's Mall",
    location: "Eldoret, Uganda Road",
    routerIp: "10.0.5.1",
    maxUsers: 50,
    status: "active",
  },
];

const ANNOUNCEMENTS = [
  {
    title: "Welcome to PesaNet WiFi",
    message:
      "Buy a package in seconds with M-Pesa and get connected instantly. New users get 10% off with code WELCOME10.",
    type: "promo",
    active: true,
    expiresAt: new Date(Date.now() + 14 * 86400000),
  },
  {
    title: "Scheduled maintenance — Kisumu site",
    message:
      "Our Kisumu Town Centre hotspot will be under maintenance tonight from 11 PM to 1 AM. We apologise for any inconvenience.",
    type: "maintenance",
    active: true,
    expiresAt: new Date(Date.now() + 2 * 86400000),
  },
  {
    title: "New Weekly Unlimited package",
    message:
      "Stay connected 7 days straight for only KES 999. Perfect for home and small business use.",
    type: "info",
    active: true,
    expiresAt: null,
  },
  {
    title: "Holiday promo ended",
    message: "Thank you for celebrating with us. Watch out for the next promo soon!",
    type: "info",
    active: false,
    expiresAt: null,
  },
];

async function main() {
  console.log("Seeding v3 feature data (sites, announcements, feedback)...");

  // Hotspot sites
  const sites = [];
  for (const s of SITES) {
    const existing = await db.hotspotSite.findFirst({ where: { name: s.name } });
    if (existing) {
      sites.push(existing);
    } else {
      const created = await db.hotspotSite.create({ data: s });
      sites.push(created);
    }
  }
  console.log(`Ensured ${sites.length} hotspot sites`);

  // Backfill siteId on a random subset of existing sessions (active ones + some recent)
  const sessions = await db.session.findMany({
    where: { siteId: null },
    take: 200,
    orderBy: { startTime: "desc" },
  });
  let assigned = 0;
  for (const sess of sessions) {
    // Pick a site weighted toward active sites
    const activeSites = sites.filter((s) => s.status === "active");
    const pool = activeSites.length > 0 ? activeSites : sites;
    const site = pool[Math.floor(Math.random() * pool.length)];
    await db.session.update({
      where: { id: sess.id },
      data: { siteId: site.id },
    });
    assigned++;
  }
  console.log(`Assigned siteId to ${assigned} sessions`);

  // Announcements
  for (const a of ANNOUNCEMENTS) {
    const existing = await db.announcement.findFirst({ where: { title: a.title } });
    if (!existing) {
      await db.announcement.create({ data: a });
    }
  }
  console.log(`Ensured ${ANNOUNCEMENTS.length} announcements`);

  // Feedback on some expired sessions
  const expiredSessions = await db.session.findMany({
    where: { status: { in: ["expired", "disconnected"] }, feedback: null },
    take: 25,
  });
  const comments = [
    "Great speeds, will definitely buy again!",
    "Connection was stable throughout. Asante!",
    "A bit slow during peak hours but otherwise good.",
    "Perfect for my WhatsApp and YouTube.",
    "Affordable and reliable. Keep it up.",
    "Wish the data lasted longer for the price.",
    "Smooth streaming, no buffering.",
    "Good service, the M-Pesa payment was instant.",
    null,
    null,
  ];
  let feedbackCount = 0;
  for (const sess of expiredSessions) {
    if (Math.random() < 0.4) continue; // not every session gets feedback
    const rating = Math.random() < 0.6 ? 5 : Math.random() < 0.7 ? 4 : Math.random() < 0.8 ? 3 : 2;
    const comment = comments[Math.floor(Math.random() * comments.length)];
    try {
      await db.feedback.create({
        data: {
          sessionId: sess.id,
          customerId: sess.customerId,
          phone: sess.phone,
          rating,
          comment,
          createdAt: new Date(new Date(sess.endTime).getTime() + 60000),
        },
      });
      feedbackCount++;
    } catch {
      /* unique constraint skip */
    }
  }
  console.log(`Created ${feedbackCount} feedback entries`);

  console.log("V3 feature seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
