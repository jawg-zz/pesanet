import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { normaliseKePhone } from "@/lib/wifi-utils";
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

export async function GET(req: Request) {
  try {
    // Auto-expire stale active sessions
    await db.session.updateMany({
      where: {
        status: "active",
        endTime: { lt: new Date() },
      },
      data: { status: "expired" },
    });

    const { searchParams } = new URL(req.url);
    const phoneParam = searchParams.get("phone");

    if (!phoneParam) {
      return NextResponse.json({ session: null });
    }

    const phone = normaliseKePhone(String(phoneParam));

    const session = await db.session.findFirst({
      where: { phone, status: "active" },
      orderBy: { startTime: "desc" },
      include: {
        customer: { select: { name: true } },
        site: { select: { name: true } },
        feedback: { select: { id: true } },
      },
    });

    return NextResponse.json({ session: session ? mapSession(session) : null });
  } catch (err) {
    console.error("GET /api/sessions/active error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
