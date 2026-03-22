import { NextResponse } from "next/server";
import { buildWatchlistsPayload } from "@/lib/page-data";
import { addWatchlistTerm, getState } from "@/lib/storage";

export async function GET() {
  const state = await getState();
  return NextResponse.json(buildWatchlistsPayload(state.watchlistTerms));
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      type?: "品牌词" | "竞品词" | "行业词" | "风险词";
      keyword?: string;
      priority?: "高" | "中" | "低";
      alerts?: boolean;
    };

    if (!body.type || !body.keyword || !body.priority) {
      return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
    }

    await addWatchlistTerm({
      type: body.type,
      keyword: body.keyword,
      priority: body.priority,
      alerts: body.alerts
    });

    const state = await getState();
    return NextResponse.json(buildWatchlistsPayload(state.watchlistTerms));
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    const status = message === "keyword_exists" ? 409 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
