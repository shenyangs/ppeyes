import { NextResponse } from "next/server";
import type { BrandProfile } from "@/lib/brand";
import { buildFallbackBrandProfile, runBrandProfileFill } from "@/lib/brand-fill";
import { getEnvGeminiSettings } from "@/lib/gemini";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      profile?: Partial<BrandProfile> | null;
    };

    const profile = body.profile || null;
    const hasSeedInput = Boolean(
      profile?.name?.trim() || profile?.product?.trim() || profile?.brief?.trim() || profile?.capabilities?.trim()
    );

    if (!hasSeedInput) {
      return NextResponse.json({ error: "missing_seed_profile" }, { status: 400 });
    }

    const envSettings = getEnvGeminiSettings();
    const settings = envSettings;

    if (!settings) {
      return NextResponse.json({
        profile: buildFallbackBrandProfile(profile),
        warning: "missing_ai_credentials"
      });
    }

    try {
      const filledProfile = await runBrandProfileFill(profile, settings);
      return NextResponse.json({ profile: filledProfile });
    } catch (error) {
      const reason = error instanceof Error ? error.message : "unknown_error";
      console.error("[api/brand-lens] AI live fill failed:", reason);
      return NextResponse.json({
        profile: buildFallbackBrandProfile(profile),
        warning: "live_fill_failed"
      });
    }
  } catch {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }
}
