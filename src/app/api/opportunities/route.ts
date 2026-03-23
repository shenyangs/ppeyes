import { NextResponse } from "next/server";
import { buildOpportunitiesPayload } from "@/lib/page-data";
import { getSavedOpportunities, saveOpportunity } from "@/lib/storage";

export async function GET() {
  const saved = await getSavedOpportunities();
  return NextResponse.json(buildOpportunitiesPayload(saved));
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      eventId?: string;
      title?: string;
      timing?: string;
      format?: string;
      note?: string;
    };

    if (!body.eventId || !body.title || !body.timing || !body.format || !body.note) {
      return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
    }

    const saved = await saveOpportunity({
      eventId: body.eventId,
      title: body.title,
      timing: body.timing,
      format: body.format,
      note: body.note
    });

    return NextResponse.json(saved);
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
