import { NextResponse } from "next/server";
import { db } from "@/lib/db";
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

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const ticket = await db.supportTicket.findUnique({ where: { id } });
    if (!ticket) {
      return NextResponse.json(
        { error: "Ticket not found" },
        { status: 404 }
      );
    }
    return NextResponse.json({ ticket: mapTicket(ticket) });
  } catch (err) {
    console.error("GET /api/tickets/[id] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();

    const existing = await db.supportTicket.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "Ticket not found" },
        { status: 404 }
      );
    }

    const data: Record<string, unknown> = {};
    if (body.status != null) {
      const valid = ["open", "in_progress", "resolved", "closed"];
      if (valid.includes(String(body.status))) {
        data.status = String(body.status);
      }
    }
    if (body.priority != null) {
      const valid = ["low", "normal", "high", "urgent"];
      if (valid.includes(String(body.priority))) {
        data.priority = String(body.priority);
      }
    }
    if (body.adminReply != null) {
      const resolved = String(body.status ?? existing.status);
      // Per spec: only store adminReply when status is resolved or closed.
      if (resolved === "resolved" || resolved === "closed") {
        data.adminReply = String(body.adminReply);
      }
    }

    const ticket = await db.supportTicket.update({ where: { id }, data });
    return NextResponse.json({ ticket: mapTicket(ticket) });
  } catch (err) {
    console.error("PATCH /api/tickets/[id] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const existing = await db.supportTicket.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "Ticket not found" },
        { status: 404 }
      );
    }
    await db.supportTicket.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/tickets/[id] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
