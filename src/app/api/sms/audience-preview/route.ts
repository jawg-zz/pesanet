import { NextResponse } from "next/server";
import { computeAudience } from "@/app/api/sms/route";

export const dynamic = "force-dynamic";

const VALID_AUDIENCES = new Set(["all", "active", "by_site", "by_package"]);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { audience, audienceFilter } = body || {};

    if (!audience || !VALID_AUDIENCES.has(String(audience))) {
      return NextResponse.json(
        {
          error:
            "Invalid audience. Must be one of: all, active, by_site, by_package",
        },
        { status: 400 }
      );
    }

    const aud = String(audience);
    const filter =
      audienceFilter != null && String(audienceFilter).trim().length > 0
        ? String(audienceFilter).trim()
        : "";

    if ((aud === "by_site" || aud === "by_package") && !filter) {
      return NextResponse.json(
        { error: `audienceFilter is required for audience="${aud}"` },
        { status: 400 }
      );
    }

    const { recipientCount, sample } = await computeAudience(aud, filter);

    return NextResponse.json({ recipientCount, sample });
  } catch (err) {
    console.error("POST /api/sms/audience-preview error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
