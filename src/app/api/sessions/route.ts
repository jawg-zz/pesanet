import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  validateKePhone,
  normaliseKePhone,
  generateFakeIP,
  generateFakeMAC,
} from "@/lib/wifi-utils";
import type { WifiSession } from "@/lib/types";

export const dynamic = "force-dynamic";

function mapSession(s: any): WifiSession {
  return {
    id: s.id,
    phone: s.phone,
    packageName: s.packageName,
    priceKES: s.priceKES,
    startTime: s.startTime,
    endTime: s.endTime,
    durationMinutes: s.durationMinutes,
    status: s.status,
    dataUsedMB: s.dataUsedMB,
    ipAddress: s.ipAddress,
    macAddress: s.macAddress,
    authMethod: s.authMethod,
    mpesaRef: s.mpesaRef,
    promoCode: s.promoCode ?? null,
    discountKES: s.discountKES ?? 0,
    siteId: s.siteId ?? null,
    siteName: s.site?.name ?? null,
    extended: s.extended ?? false,
    hasFeedback: !!s.feedback,
    customer: s.customer ? { name: s.customer.name } : null,
  };
}

/** Mark any active sessions whose endTime is in the past as expired. */
async function autoExpire() {
  await db.session.updateMany({
    where: {
      status: "active",
      endTime: { lt: new Date() },
    },
    data: { status: "expired" },
  });
}

export async function GET(req: Request) {
  try {
    await autoExpire();

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");

    const where =
      status === "active" || status === "expired" || status === "disconnected"
        ? { status }
        : undefined;

    const sessions = await db.session.findMany({
      where,
      orderBy: { startTime: "desc" },
      take: 200,
      include: {
        customer: { select: { name: true } },
        site: { select: { name: true } },
        feedback: { select: { id: true } },
      },
    });

    return NextResponse.json({ sessions: sessions.map(mapSession) });
  } catch (err) {
    console.error("GET /api/sessions error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { phone, packageId, authMethod, mpesaRef } = body || {};

    if (!phone || !packageId) {
      return NextResponse.json(
        { error: "Missing phone or packageId" },
        { status: 400 }
      );
    }

    if (!validateKePhone(String(phone))) {
      return NextResponse.json(
        { error: "Invalid phone number" },
        { status: 400 }
      );
    }

    const normalisedPhone = normaliseKePhone(String(phone));

    const pkg = await db.package.findUnique({ where: { id: String(packageId) } });
    if (!pkg) {
      return NextResponse.json(
        { error: "Package not found" },
        { status: 400 }
      );
    }

    const customer = await db.customer.upsert({
      where: { phone: normalisedPhone },
      update: {},
      create: { phone: normalisedPhone },
    });

    const method = authMethod === "voucher" ? "voucher" : "mpesa";
    const now = new Date();
    const endTime = new Date(now.getTime() + pkg.durationMinutes * 60 * 1000);

    // Tag the session to a random active hotspot site (first active, fallback random).
    let siteId: string | undefined;
    const activeSites = await db.hotspotSite.findMany({
      where: { status: "active" },
      select: { id: true },
    });
    if (activeSites.length > 0) {
      const pick =
        activeSites.length === 1
          ? activeSites[0]
          : activeSites[Math.floor(Math.random() * activeSites.length)];
      siteId = pick.id;
    }

    const session = await db.session.create({
      data: {
        customerId: customer.id,
        packageId: pkg.id,
        phone: normalisedPhone,
        packageName: pkg.name,
        priceKES: pkg.priceKES,
        startTime: now,
        endTime,
        durationMinutes: pkg.durationMinutes,
        status: "active",
        authMethod: method,
        mpesaRef: mpesaRef ?? null,
        ipAddress: generateFakeIP(),
        macAddress: generateFakeMAC(),
        ...(siteId ? { siteId } : {}),
      },
      include: {
        customer: { select: { name: true } },
        site: { select: { name: true } },
        feedback: { select: { id: true } },
      },
    });

    return NextResponse.json({ session: mapSession(session) });
  } catch (err) {
    console.error("POST /api/sessions error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
