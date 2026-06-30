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

    const sessions = await db.session.findMany({
      where: {
        startTime: { gte: fromD, lt: toD },
      },
      orderBy: { startTime: "asc" },
    });

    const rows = sessions.map((s) => ({
      "Start Time": s.startTime.toISOString(),
      Phone: s.phone,
      Package: s.packageName,
      "Price (KES)": s.priceKES,
      "Duration (min)": s.durationMinutes,
      Status: s.status,
      "Data Used (MB)": s.dataUsedMB,
      "Auth Method": s.authMethod,
      "M-Pesa Ref": s.mpesaRef ?? "",
      "IP Address": s.ipAddress ?? "",
    }));

    const csv = buildCsv(
      [
        "Start Time",
        "Phone",
        "Package",
        "Price (KES)",
        "Duration (min)",
        "Status",
        "Data Used (MB)",
        "Auth Method",
        "M-Pesa Ref",
        "IP Address",
      ],
      rows
    );

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": 'attachment; filename="sessions.csv"',
      },
    });
  } catch (err) {
    console.error("GET /api/reports/sessions error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
