import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { Announcement } from "@/lib/types";

export const dynamic = "force-dynamic";

function mapAnnouncement(a: any): Announcement {
  return {
    id: a.id,
    title: a.title,
    message: a.message,
    type: a.type,
    active: a.active,
    expiresAt: a.expiresAt ?? null,
    createdAt: a.createdAt,
  };
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const existing = await db.announcement.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "Announcement not found" },
        { status: 404 }
      );
    }

    const body = await req.json();
    const { title, message, type, active, expiresAt } = body || {};

    const data: any = {};
    if (title != null && typeof title === "string" && title.trim()) {
      data.title = title.trim();
    }
    if (message != null && typeof message === "string" && message.trim()) {
      data.message = message.trim();
    }
    if (type != null) {
      const validTypes = ["info", "warning", "maintenance", "promo"];
      if (validTypes.includes(String(type))) data.type = String(type);
    }
    if (active != null) {
      data.active = Boolean(active);
    }
    if (expiresAt != null) {
      if (String(expiresAt).trim() === "") {
        data.expiresAt = null;
      } else {
        const d = new Date(String(expiresAt));
        if (!isNaN(d.getTime())) data.expiresAt = d;
      }
    }

    const announcement = await db.announcement.update({
      where: { id },
      data,
    });

    return NextResponse.json({ announcement: mapAnnouncement(announcement) });
  } catch (err) {
    console.error("PUT /api/announcements/[id] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const existing = await db.announcement.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "Announcement not found" },
        { status: 404 }
      );
    }

    await db.announcement.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/announcements/[id] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
