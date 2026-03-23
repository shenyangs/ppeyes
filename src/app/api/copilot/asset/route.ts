import { NextResponse } from "next/server";
import type { BrandProfile } from "@/lib/brand";
import {
  buildCommandAssetResult,
  type CommandAssetKind,
  type CopilotCommandResult
} from "@/lib/native-ai";
import type { WorkspaceEvent } from "@/lib/page-data";
import { hasLiveAiConfigured } from "@/lib/ai-status";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      assetKind?: CommandAssetKind;
      command?: CopilotCommandResult;
      selectedEvent?: WorkspaceEvent | null;
      brandProfile?: BrandProfile | null;
    };

    if (!body.assetKind || !body.command) {
      return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
    }

    if (!hasLiveAiConfigured()) {
      return NextResponse.json({ error: "ai_not_configured" }, { status: 503 });
    }

    try {
      const result = await buildCommandAssetResult({
        assetKind: body.assetKind,
        command: body.command,
        selectedEvent: body.selectedEvent || null,
        brandProfile: body.brandProfile || null
      });

      return NextResponse.json({ result });
    } catch (error) {
      const reason = error instanceof Error ? error.message : "unknown_error";
      console.error("[api/copilot/asset] live asset failed:", reason);
      return NextResponse.json({ error: "ai_live_failed" }, { status: 502 });
    }
  } catch {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }
}
