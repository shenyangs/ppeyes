import { NextResponse } from "next/server";
import { buildWorkspaceFallback, buildWorkspaceNativeAiDigest } from "@/lib/native-ai";
import type { WorkspacePayload } from "@/lib/page-data";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      workspace?: WorkspacePayload;
    };

    if (!body.workspace) {
      return NextResponse.json({ error: "missing_workspace" }, { status: 400 });
    }

    try {
      const digest = await buildWorkspaceNativeAiDigest(body.workspace);
      return NextResponse.json({ digest });
    } catch (error) {
      const reason = error instanceof Error ? error.message : "unknown_error";
      console.error("[api/copilot/workspace] live digest failed:", reason);
      return NextResponse.json({ digest: buildWorkspaceFallback(body.workspace), warning: "live_digest_failed" });
    }
  } catch {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }
}
