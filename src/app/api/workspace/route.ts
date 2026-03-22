import { NextResponse } from "next/server";
import { buildWorkspacePayload, type WorkspaceQuery } from "@/lib/page-data";
import { buildFallbackNewsNow, fetchNewsNowSources } from "@/lib/newsnow";
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

  const state = await getState();
  let upstream: Awaited<ReturnType<typeof fetchNewsNowSources>> | ReturnType<typeof buildFallbackNewsNow> =
    buildFallbackNewsNow();

  try {
    upstream = await fetchNewsNowSources(query.platforms);
  } catch {
    upstream = buildFallbackNewsNow();
  }

  const rankedEvents = deferAi
    ? upstream.events.map((event) => ({ ...event }))
    : await enhanceEventsWithAiBrandView(upstream.events, query.brandProfile);

  return NextResponse.json(
    buildWorkspacePayload(
      query,
      state.savedOpportunities.map((item) => item.eventId),
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
