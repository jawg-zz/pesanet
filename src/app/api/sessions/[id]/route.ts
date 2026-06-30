import { NextResponse } from "next/server";
import { db } from "@/lib/db";
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
    customer: s.customer ? { name: s.customer.name } : null,
  };
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { action } = body || {};

    if (action !== "disconnect") {
      return NextResponse.json(
        { error: "Unsupported action" },
        { status: 400 }
      );
    }

    const existing = await db.session.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 }
      );
    }

    const updated = await db.session.update({
      where: { id },
      data: { status: "disconnected" },
      include: { customer: { select: { name: true } } },
    });

    // Tell the network backend to kick the live connection.
    try {
      const { getNetworkProvider } = await import("@/lib/network-provider")
      const provider = await getNetworkProvider(existing.siteId)
      void provider.disconnect(existing.phone, existing.id, existing.phone)
    } catch (e) {
      console.error("Network backend disconnect failed:", e)
    }

    return NextResponse.json({ session: mapSession(updated) });
  } catch (err) {
    console.error("PATCH /api/sessions/[id] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
