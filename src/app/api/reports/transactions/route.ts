import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/** Escape a CSV field per RFC 4180. */
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

function parseFromTo(from?: string | null, to?: string | null) {
  const now = new Date();
  let fromD: Date;
  let toD: Date;
  if (from) {
    fromD = new Date(`${from}T00:00:00+03:00`);
  } else {
    fromD = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  }
  if (to) {
    // End of the day (Nairobi) — i.e. start of next day
    const d = new Date(`${to}T00:00:00+03:00`);
    toD = new Date(d.getTime() + 24 * 60 * 60 * 1000);
  } else {
    toD = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  }
  return { fromD, toD };
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const { fromD, toD } = parseFromTo(
      searchParams.get("from"),
      searchParams.get("to")
    );

    const transactions = await db.transaction.findMany({
      where: {
        status: "completed",
        createdAt: { gte: fromD, lt: toD },
      },
      orderBy: { createdAt: "asc" },
    });

    const rows = transactions.map((t) => ({
      Date: t.createdAt.toISOString(),
      Phone: t.phone,
      "Amount (KES)": t.amountKES,
      Package: t.packageName ?? "",
      Method: t.method,
      "M-Pesa Ref": t.mpesaRef ?? "",
      Status: t.status,
      "Promo Code": t.promoCode ?? "",
      "Discount (KES)": t.discountKES ?? 0,
    }));

    const csv = buildCsv(
      [
        "Date",
        "Phone",
        "Amount (KES)",
        "Package",
        "Method",
        "M-Pesa Ref",
        "Status",
        "Promo Code",
        "Discount (KES)",
      ],
      rows
    );

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": 'attachment; filename="transactions.csv"',
      },
    });
  } catch (err) {
    console.error("GET /api/reports/transactions error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
