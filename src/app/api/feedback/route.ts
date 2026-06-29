import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { Feedback } from "@/lib/types";

export const dynamic = "force-dynamic";

function mapFeedback(f: any): Feedback {
  return {
    id: f.id,
    sessionId: f.sessionId,
    phone: f.phone,
    rating: f.rating,
    comment: f.comment ?? null,
    packageName: f.session?.packageName ?? null,
    createdAt: f.createdAt,
  };
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const ratingParam = searchParams.get("rating");

    const where: any = {};
    if (ratingParam != null) {
      const r = Number(ratingParam);
      if (Number.isInteger(r) && r >= 1 && r <= 5) {
        where.rating = r;
      }
    }

    const feedback = await db.feedback.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        session: { select: { packageName: true } },
      },
    });

    return NextResponse.json({ feedback: feedback.map(mapFeedback) });
  } catch (err) {
    console.error("GET /api/feedback error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { sessionId, rating, comment } = body || {};

    if (!sessionId || typeof sessionId !== "string") {
      return NextResponse.json(
        { error: "Missing sessionId" },
        { status: 400 }
      );
    }
    const r = Number(rating);
    if (!Number.isInteger(r) || r < 1 || r > 5) {
      return NextResponse.json(
        { error: "rating must be an integer between 1 and 5" },
        { status: 400 }
      );
    }

    const session = await db.session.findUnique({
      where: { id: String(sessionId) },
    });
    if (!session) {
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 }
      );
    }

    const existing = await db.feedback.findUnique({
      where: { sessionId: session.id },
    });
    if (existing) {
      return NextResponse.json(
        { error: "Feedback already submitted for this session" },
        { status: 400 }
      );
    }

    const data: any = {
      sessionId: session.id,
      phone: session.phone,
      rating: r,
    };
    if (session.customerId) data.customerId = session.customerId;
    if (comment != null && String(comment).trim().length > 0) {
      data.comment = String(comment).trim();
    }

    const feedback = await db.feedback.create({
      data,
      include: { session: { select: { packageName: true } } },
    });

    return NextResponse.json({ feedback: mapFeedback(feedback) });
  } catch (err) {
    console.error("POST /api/feedback error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
