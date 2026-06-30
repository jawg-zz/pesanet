import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { validateKePhone, normaliseKePhone } from "@/lib/wifi-utils";
import type { SupportTicket } from "@/lib/types";

export const dynamic = "force-dynamic";

function mapTicket(t: any): SupportTicket {
  return {
    id: t.id,
    phone: t.phone,
    customerName: t.customerName ?? null,
    subject: t.subject,
    message: t.message,
    category: t.category,
    priority: t.priority,
    status: t.status,
    adminReply: t.adminReply ?? null,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
  };
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");

    const where: { status?: { in: string[] } } = {};
    if (status) {
      const valid = ["open", "in_progress", "resolved", "closed"];
      if (valid.includes(String(status))) {
        where.status = { in: [String(status)] };
      }
    }

    const tickets = await db.supportTicket.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ tickets: tickets.map(mapTicket) });
  } catch (err) {
    console.error("GET /api/tickets error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { phone, customerName, subject, message, category, priority } =
      body || {};

    if (!phone || !subject || !message) {
      return NextResponse.json(
        { error: "Missing required fields: phone, subject, message" },
        { status: 400 }
      );
    }

    if (!validateKePhone(String(phone))) {
      return NextResponse.json(
        { error: "Invalid Kenyan phone number" },
        { status: 400 }
      );
    }

    const normalisedPhone = normaliseKePhone(String(phone));

    // Upsert customer — create if not exists, optionally set name
    const customer = await db.customer.upsert({
      where: { phone: normalisedPhone },
      update: customerName ? { name: String(customerName) } : {},
      create: {
        phone: normalisedPhone,
        name: customerName ? String(customerName) : null,
      },
    });

    const validCategories = [
      "general",
      "billing",
      "connectivity",
      "voucher",
      "other",
    ];
    const validPriorities = ["low", "normal", "high", "urgent"];

    const finalCategory = category
      ? validCategories.includes(String(category))
        ? String(category)
        : "general"
      : "general";

    const finalPriority = priority
      ? validPriorities.includes(String(priority))
        ? String(priority)
        : "normal"
      : "normal";

    const ticket = await db.supportTicket.create({
      data: {
        customerId: customer.id,
        phone: normalisedPhone,
        customerName: customerName ? String(customerName) : customer.name,
        subject: String(subject),
        message: String(message),
        category: finalCategory,
        priority: finalPriority,
        status: "open",
      },
    });

    return NextResponse.json({ ticket: mapTicket(ticket) });
  } catch (err) {
    console.error("POST /api/tickets error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
