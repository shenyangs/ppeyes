import { NextResponse } from "next/server";
import type { BrandProfile } from "@/lib/brand";
import { buildFallbackAnalysis, runGeminiAnalysis } from "@/lib/analysis";
import { getEnvAiSettings } from "@/lib/gemini";
import type { EventItem } from "@/lib/homepage-data";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      event?: EventItem;
      brandProfile?: Partial<BrandProfile> | null;
    };

    if (!body.event) {
      return NextResponse.json({ error: "missing_event" }, { status: 400 });
    }

    const envSettings = getEnvAiSettings();
    const settings = envSettings;

    if (!settings) {
      return NextResponse.json({
        analysis: buildFallbackAnalysis(body.event, body.brandProfile),
        warning: "missing_ai_credentials"
      });
    }

    try {
      const analysis = await runGeminiAnalysis(body.event, settings, body.brandProfile);
      return NextResponse.json({ analysis });
    } catch (error) {
      const reason = error instanceof Error ? error.message : "unknown_error";
      console.error("[api/analyze] AI live analysis failed:", reason);
      return NextResponse.json({
        analysis: buildFallbackAnalysis(body.event, body.brandProfile),
        warning: "live_analysis_failed"
      });
    }
  } catch {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }
}
