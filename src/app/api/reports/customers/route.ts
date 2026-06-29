import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

function csvField(value: unknown): string {
  const s = value == null ? "" : String(value);
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function buildCsv(
  headers: string[],
  rows: Array<Record<string, unknown>>
): string {
  const lines: string[] = [headers.map(csvField).join(",")];
  for (const row of rows) {
    lines.push(headers.map((h) => csvField(row[h])).join(","));
  }
  return lines.join("\n");
}

export async function GET() {
  try {
    const customers = await db.customer.findMany({
      orderBy: { createdAt: "asc" },
      include: {
        sessions: {
          select: { startTime: true },
          orderBy: { startTime: "desc" },
        },
        transactions: {
          where: { status: "completed" },
          select: { amountKES: true },
        },
      },
    });

    const rows = customers.map((c) => {
      const totalSpent = c.transactions.reduce(
        (sum, t) => sum + (t.amountKES || 0),
        0
      );
      const lastActive =
        c.sessions.length > 0
          ? c.sessions[0].startTime.toISOString()
          : "";
      return {
        Phone: c.phone,
        Name: c.name ?? "",
        Joined: c.createdAt.toISOString(),
        "Total Spent (KES)": totalSpent,
        Sessions: c.sessions.length,
        "Last Active": lastActive,
      };
    });

    const csv = buildCsv(
      ["Phone", "Name", "Joined", "Total Spent (KES)", "Sessions", "Last Active"],
      rows
    );

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": 'attachment; filename="customers.csv"',
      },
    });
  } catch (err) {
    console.error("GET /api/reports/customers error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
