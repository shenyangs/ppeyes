import { NextResponse } from "next/server";
import { buildWatchlistsFallback, buildWatchlistsNativeAiDigest } from "@/lib/native-ai";
import type { WatchlistsPayload } from "@/lib/page-data";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      watchlists?: WatchlistsPayload;
    };

    if (!body.watchlists) {
      return NextResponse.json({ error: "missing_watchlists" }, { status: 400 });
    }

    try {
      const digest = await buildWatchlistsNativeAiDigest(body.watchlists);
      return NextResponse.json({ digest });
    } catch (error) {
      const reason = error instanceof Error ? error.message : "unknown_error";
      console.error("[api/copilot/watchlists] live digest failed:", reason);
      return NextResponse.json({ digest: buildWatchlistsFallback(body.watchlists), warning: "live_digest_failed" });
    }
  } catch {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }
}
