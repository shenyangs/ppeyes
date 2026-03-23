import { NextResponse } from "next/server";
import { buildOpportunitiesFallback, buildOpportunitiesNativeAiDigest } from "@/lib/native-ai";
import type { OpportunitiesPayload } from "@/lib/page-data";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      opportunities?: OpportunitiesPayload;
    };

    if (!body.opportunities) {
      return NextResponse.json({ error: "missing_opportunities" }, { status: 400 });
    }

    try {
      const digest = await buildOpportunitiesNativeAiDigest(body.opportunities);
      return NextResponse.json({ digest });
    } catch (error) {
      const reason = error instanceof Error ? error.message : "unknown_error";
      console.error("[api/copilot/opportunities] live digest failed:", reason);
      return NextResponse.json({
        digest: buildOpportunitiesFallback(body.opportunities),
        warning: "live_digest_failed"
      });
    }
  } catch {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }
}
