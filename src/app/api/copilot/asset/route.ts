import { NextResponse } from "next/server";
import type { BrandProfile } from "@/lib/brand";
import {
  buildCommandAssetFallback,
  buildCommandAssetResult,
  type CommandAssetKind,
  type CopilotCommandResult
} from "@/lib/native-ai";
import type { WorkspaceEvent } from "@/lib/page-data";

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

      return NextResponse.json({
        result: buildCommandAssetFallback({
          assetKind: body.assetKind,
          command: body.command,
          selectedEvent: body.selectedEvent || null,
          brandProfile: body.brandProfile || null
        }),
        warning: "live_asset_failed"
      });
    }
  } catch {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }
}
