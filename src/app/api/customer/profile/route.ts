import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { normaliseKePhone } from "@/lib/wifi-utils";

export const dynamic = "force-dynamic";

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { phone, name, email, location } = body || {};

    if (!phone) {
      return NextResponse.json(
        { error: "Missing phone" },
        { status: 400 }
      );
    }

    const normalisedPhone = normaliseKePhone(String(phone));

    const existing = await db.customer.findUnique({
      where: { phone: normalisedPhone },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Customer not found" },
        { status: 404 }
      );
    }

    const data: Record<string, unknown> = {};
    if (name != null) data.name = name ? String(name) : null;
    if (email != null) data.email = email ? String(email) : null;
    if (location != null) data.location = location ? String(location) : null;

    const updated = await db.customer.update({
      where: { id: existing.id },
      data,
    });

    return NextResponse.json({
      customer: {
        id: updated.id,
        phone: updated.phone,
        name: updated.name,
        email: updated.email,
        location: updated.location,
      },
    });
  } catch (err) {
    console.error("PUT /api/customer/profile error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
