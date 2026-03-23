import { NextResponse } from "next/server";
import { buildBriefingsFallback, buildBriefingsNativeAiDigest } from "@/lib/native-ai";
import type { BriefingsPayload } from "@/lib/page-data";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      briefings?: BriefingsPayload;
    };

    if (!body.briefings) {
      return NextResponse.json({ error: "missing_briefings" }, { status: 400 });
    }

    try {
      const digest = await buildBriefingsNativeAiDigest(body.briefings);
      return NextResponse.json({ digest });
    } catch (error) {
      const reason = error instanceof Error ? error.message : "unknown_error";
      console.error("[api/copilot/briefings] live digest failed:", reason);
      return NextResponse.json({ digest: buildBriefingsFallback(body.briefings), warning: "live_digest_failed" });
    }
  } catch {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }
}
