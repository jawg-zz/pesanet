import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { username, password } = body || {};

    if (!username || !password) {
      return NextResponse.json(
        { success: false, message: "Missing username or password" },
        { status: 400 }
      );
    }

    const admin = await db.adminUser.findUnique({
      where: { username: String(username) },
    });

    if (!admin || admin.passwordHash !== String(password)) {
      return NextResponse.json(
        { success: false, message: "Invalid credentials" },
        { status: 401 }
      );
    }

    return NextResponse.json({ success: true, name: admin.name });
  } catch (err) {
    console.error("POST /api/admin/login error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
