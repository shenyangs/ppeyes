import { NextResponse } from "next/server";
import { buildCopilotCommandResult } from "@/lib/native-ai";
import type { BrandProfile } from "@/lib/brand";
import type { WorkspacePayload } from "@/lib/page-data";
import type { WorkspaceEvent } from "@/lib/page-data";
import { hasLiveAiConfigured } from "@/lib/ai-status";
import { detectTrueAiIntent } from "@/lib/ai-core";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      prompt?: string;
      workspace?: WorkspacePayload;
      selectedEvent?: WorkspaceEvent | null;
      brandProfile?: BrandProfile | null;
    };

    if (!body.prompt?.trim()) {
      return NextResponse.json({ error: "missing_prompt" }, { status: 400 });
    }

    if (!body.workspace) {
      return NextResponse.json({ error: "missing_workspace" }, { status: 400 });
    }

    if (!hasLiveAiConfigured()) {
      return NextResponse.json({ error: "ai_not_configured" }, { status: 503 });
    }

    const commandKind = detectTrueAiIntent(body.prompt);
    if (!commandKind) {
      return NextResponse.json({ error: "unsupported_command" }, { status: 400 });
    }

    if (!body.selectedEvent) {
      return NextResponse.json({ error: "missing_selected_event" }, { status: 400 });
    }

    try {
      const result = await buildCopilotCommandResult({
        prompt: body.prompt,
        workspace: body.workspace,
        selectedEvent: body.selectedEvent || null,
        brandProfile: body.brandProfile || null
      });

      return NextResponse.json({ result });
    } catch (error) {
      const reason = error instanceof Error ? error.message : "unknown_error";
      console.error("[api/copilot/command] live command failed:", reason);
      return NextResponse.json({ error: "ai_live_failed" }, { status: 502 });
    }
  } catch {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }
}
