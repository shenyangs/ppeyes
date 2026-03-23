import { NextResponse } from "next/server";
import { buildBriefingsNativeAiDigest } from "@/lib/native-ai";
import type { BriefingsPayload } from "@/lib/page-data";
import { hasLiveAiConfigured } from "@/lib/ai-status";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      briefings?: BriefingsPayload;
    };

    if (!body.briefings) {
      return NextResponse.json({ error: "missing_briefings" }, { status: 400 });
    }

    if (!hasLiveAiConfigured()) {
      return NextResponse.json({ error: "ai_not_configured" }, { status: 503 });
    }

    try {
      const digest = await buildBriefingsNativeAiDigest(body.briefings);
      return NextResponse.json({ digest });
    } catch (error) {
      const reason = error instanceof Error ? error.message : "unknown_error";
      console.error("[api/copilot/briefings] live digest failed:", reason);
      return NextResponse.json({ error: "ai_live_failed" }, { status: 502 });
    }
  } catch {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }
}
