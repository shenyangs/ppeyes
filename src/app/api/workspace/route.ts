import { NextResponse } from "next/server";
import { buildWorkspacePayload, type WorkspaceQuery } from "@/lib/page-data";
import { buildFallbackNewsNow, fetchNewsNowSources, loadLatestNewsNowSnapshot } from "@/lib/newsnow";
import { enhanceEventsWithAiBrandView } from "@/lib/brand-ai";
import { getState } from "@/lib/storage";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const deferAi = searchParams.get("deferAi") === "1";

  const query: WorkspaceQuery = {
    q: searchParams.get("q") ?? undefined,
    time: (searchParams.get("time") as WorkspaceQuery["time"]) ?? undefined,
    industry: searchParams.get("industry") ?? undefined,
    risk: (searchParams.get("risk") as WorkspaceQuery["risk"]) ?? undefined,
    metric: (searchParams.get("metric") as WorkspaceQuery["metric"]) ?? undefined,
    sort: (searchParams.get("sort") as WorkspaceQuery["sort"]) ?? undefined,
    platforms: searchParams.get("platforms")?.split(",").filter(Boolean),
    watchlists: searchParams.get("watchlists")?.split(",").filter(Boolean) as WorkspaceQuery["watchlists"],
    brandProfile: {
      name: searchParams.get("brandName") ?? "",
      product: searchParams.get("brandProduct") ?? "",
      brief: searchParams.get("brandBrief") ?? "",
      capabilities: searchParams.get("brandCapabilities") ?? "",
      objective: searchParams.get("brandObjective") ?? "",
      guardrails: searchParams.get("brandGuardrails") ?? ""
    }
  };

  let savedEventIds: string[] = [];
  try {
    const state = await getState();
    savedEventIds = state.savedOpportunities.map((item) => item.eventId);
  } catch {
    savedEventIds = [];
  }
  let upstream:
    | Awaited<ReturnType<typeof fetchNewsNowSources>>
    | Awaited<ReturnType<typeof loadLatestNewsNowSnapshot>>
    | ReturnType<typeof buildFallbackNewsNow>;

  try {
    upstream = await fetchNewsNowSources(query.platforms);
  } catch {
    try {
      upstream = await fetchNewsNowSources(query.platforms, {
        allowStaleSource: true
      });
    } catch {
      upstream = await loadLatestNewsNowSnapshot();
    }
  }

  if (!upstream) {
    upstream = await loadLatestNewsNowSnapshot(Number.POSITIVE_INFINITY);
  }

  if (!upstream) {
    upstream = buildFallbackNewsNow();
  }

  let rankedEvents = upstream.events.map((event) => ({ ...event }));
  if (!deferAi) {
    try {
      rankedEvents = await enhanceEventsWithAiBrandView(upstream.events, query.brandProfile);
    } catch {
      rankedEvents = upstream.events.map((event) => ({ ...event }));
    }
  }

  return NextResponse.json(
    buildWorkspacePayload(
      query,
      savedEventIds,
      rankedEvents,
      upstream.source,
      upstream.fetchedAt
    ),
    {
      headers: {
        "Cache-Control": "no-store, max-age=0"
      }
    }
  );
}
