import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { generateMpesaRef, generateFakeIP, generateFakeMAC } from "@/lib/wifi-utils";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const transaction = await db.transaction.findUnique({ where: { id } });
    if (!transaction) {
      return NextResponse.json(
        { error: "Transaction not found" },
        { status: 404 }
      );
    }

    if (transaction.status === "completed") {
      const session = transaction.packageId
        ? await db.session.findFirst({
            where: {
              customerId: transaction.customerId ?? undefined,
              mpesaRef: transaction.mpesaRef ?? undefined,
            },
            orderBy: { startTime: "desc" },
          })
        : null;
      return NextResponse.json({
        status: transaction.status,
        mpesaRef: transaction.mpesaRef,
        sessionId: session?.id ?? null,
        packageName: transaction.packageName,
        priceKES: transaction.amountKES,
        message: "Payment completed",
      });
    }

    if (transaction.status === "failed") {
      return NextResponse.json({
        status: transaction.status,
        message: "Payment failed",
      });
    }

    // status === "pending"
    const elapsed = Date.now() - transaction.createdAt.getTime();

    if (elapsed >= 4000) {
      // simulate success
      const mpesaRef = generateMpesaRef();

      const updatedTx = await db.transaction.update({
        where: { id },
        data: { status: "completed", mpesaRef },
      });

      let sessionId: string | null = null;
      if (updatedTx.packageId) {
        const pkg = await db.package.findUnique({
          where: { id: updatedTx.packageId },
        });
        if (pkg && updatedTx.customerId) {
          const now = new Date();
          const endTime = new Date(
            now.getTime() + pkg.durationMinutes * 60 * 1000
          );
          const session = await db.session.create({
            data: {
              customerId: updatedTx.customerId,
              packageId: pkg.id,
              phone: updatedTx.phone,
              packageName: pkg.name,
              priceKES: pkg.priceKES,
              startTime: now,
              endTime,
              durationMinutes: pkg.durationMinutes,
              status: "active",
              authMethod: "mpesa",
              mpesaRef,
              ipAddress: generateFakeIP(),
              macAddress: generateFakeMAC(),
            },
          });
          sessionId = session.id;
        }
      }

      return NextResponse.json({
        status: "completed",
        mpesaRef,
        sessionId,
        packageName: updatedTx.packageName,
        priceKES: updatedTx.amountKES,
        message: "Payment confirmed. You are now connected.",
      });
    }

    return NextResponse.json({
      status: "pending",
      message: "Waiting for M-Pesa confirmation...",
    });
  } catch (err) {
    console.error("GET /api/mpesa/status/[id] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
