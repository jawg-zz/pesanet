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

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const all = searchParams.get("all") === "true";
    const now = new Date();

    const where = all
      ? undefined
      : {
          active: true,
          OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
        };

    const announcements = await db.announcement.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      announcements: announcements.map(mapAnnouncement),
    });
  } catch (err) {
    console.error("GET /api/announcements error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { title, message, type, active, expiresAt } = body || {};

    if (!title || typeof title !== "string" || !title.trim()) {
      return NextResponse.json(
        { error: "Missing or invalid title" },
        { status: 400 }
      );
    }
    if (!message || typeof message !== "string" || !message.trim()) {
      return NextResponse.json(
        { error: "Missing or invalid message" },
        { status: 400 }
      );
    }

    const validTypes = ["info", "warning", "maintenance", "promo"];
    const finalType =
      type && validTypes.includes(String(type)) ? String(type) : "info";

    const data: any = {
      title: title.trim(),
      message: message.trim(),
      type: finalType,
      active: active == null ? true : Boolean(active),
    };
    if (expiresAt != null && String(expiresAt).trim() !== "") {
      const d = new Date(String(expiresAt));
      if (!isNaN(d.getTime())) data.expiresAt = d;
    }

    const announcement = await db.announcement.create({ data });
    return NextResponse.json({ announcement: mapAnnouncement(announcement) });
  } catch (err) {
    console.error("POST /api/announcements error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
