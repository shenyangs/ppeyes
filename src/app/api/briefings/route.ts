import { NextResponse } from "next/server";
import { buildBriefingsPayload } from "@/lib/page-data";
import { getSavedBriefings, saveBriefing } from "@/lib/storage";

export async function GET() {
  const saved = await getSavedBriefings();
  return NextResponse.json(buildBriefingsPayload(saved));
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      title?: string;
      type?: string;
      note?: string;
      content?: string;
    };

    if (!body.title || !body.type || !body.note || !body.content) {
      return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
    }

    await saveBriefing({
      title: body.title,
      type: body.type,
      note: body.note,
      content: body.content
    });

    const saved = await getSavedBriefings();
    return NextResponse.json(buildBriefingsPayload(saved));
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
