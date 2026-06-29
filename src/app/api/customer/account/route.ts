import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { normaliseKePhone } from "@/lib/wifi-utils";
import type {
  CustomerAccount,
  WifiSession,
  WifiTransaction,
  SupportTicket,
} from "@/lib/types";

export const dynamic = "force-dynamic";

function mapSession(s: any): WifiSession {
  return {
    id: s.id,
    phone: s.phone,
    packageName: s.packageName,
    priceKES: s.priceKES,
    startTime: s.startTime.toISOString(),
    endTime: s.endTime.toISOString(),
    durationMinutes: s.durationMinutes,
    status: s.status,
    dataUsedMB: s.dataUsedMB,
    ipAddress: s.ipAddress ?? null,
    macAddress: s.macAddress ?? null,
    authMethod: s.authMethod,
    mpesaRef: s.mpesaRef ?? null,
    promoCode: s.promoCode ?? null,
    discountKES: s.discountKES ?? 0,
  };
}

function mapTransaction(t: any): WifiTransaction {
  return {
    id: t.id,
    phone: t.phone,
    amountKES: t.amountKES,
    packageName: t.packageName ?? null,
    method: t.method,
    mpesaRef: t.mpesaRef ?? null,
    status: t.status,
    promoCode: t.promoCode ?? null,
    discountKES: t.discountKES ?? 0,
    resellerId: t.resellerId ?? null,
    createdAt: t.createdAt.toISOString(),
  };
}

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
    const phone = searchParams.get("phone");

    if (!phone) {
      return NextResponse.json(
        { error: "Missing phone query parameter" },
        { status: 400 }
      );
    }

    const normalisedPhone = normaliseKePhone(String(phone));

    const customer = await db.customer.findUnique({
      where: { phone: normalisedPhone },
    });

    if (!customer) {
      return NextResponse.json(
        { error: "Account not found" },
        { status: 404 }
      );
    }

    // Auto-expire stale active sessions
    await db.session.updateMany({
      where: {
        customerId: customer.id,
        status: "active",
        endTime: { lt: new Date() },
      },
      data: { status: "expired" },
    });

    const [
      completedTxRows,
      sessionCount,
      activeSessionsRaw,
      recentSessionsRaw,
      recentTransactionsRaw,
      ticketsRaw,
    ] = await Promise.all([
      db.transaction.findMany({
        where: { customerId: customer.id, status: "completed" },
        select: { amountKES: true },
      }),
      db.session.count({ where: { customerId: customer.id } }),
      db.session.findMany({
        where: { customerId: customer.id, status: "active" },
        orderBy: { startTime: "desc" },
      }),
      db.session.findMany({
        where: { customerId: customer.id },
        orderBy: { startTime: "desc" },
        take: 10,
      }),
      db.transaction.findMany({
        where: { customerId: customer.id },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
      db.supportTicket.findMany({
        where: { phone: customer.phone },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    const totalSpent = completedTxRows.reduce(
      (sum, t) => sum + (t.amountKES || 0),
      0
    );

    const account: CustomerAccount = {
      id: customer.id,
      phone: customer.phone,
      name: customer.name,
      email: customer.email,
      location: customer.location,
      createdAt: customer.createdAt.toISOString(),
      totalSpent,
      sessionCount,
      activeSessions: activeSessionsRaw.map(mapSession),
      recentSessions: recentSessionsRaw.map(mapSession),
      recentTransactions: recentTransactionsRaw.map(mapTransaction),
      tickets: ticketsRaw.map(mapTicket),
    };

    return NextResponse.json(account);
  } catch (err) {
    console.error("GET /api/customer/account error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
