import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { AdminCustomer } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const customers = await db.customer.findMany({
      include: {
        sessions: {
          select: { priceKES: true, startTime: true },
          orderBy: { startTime: "desc" },
        },
      },
    });

    const result: AdminCustomer[] = customers.map((c) => {
      const totalSpent = c.sessions.reduce(
        (sum, s) => sum + (s.priceKES || 0),
        0
      );
      const sessionCount = c.sessions.length;
      const lastActive =
        c.sessions.length > 0 ? c.sessions[0].startTime : null;

      return {
        id: c.id,
        phone: c.phone,
        name: c.name,
        createdAt: c.createdAt,
        totalSpent,
        sessionCount,
        lastActive,
      };
    });

    // Sort by totalSpent desc
    result.sort((a, b) => b.totalSpent - a.totalSpent);

    return NextResponse.json({ customers: result });
  } catch (err) {
    console.error("GET /api/admin/customers error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
