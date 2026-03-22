import { NextResponse } from "next/server";
import { briefingsPayload } from "@/lib/page-data";

export async function GET() {
  return NextResponse.json(briefingsPayload);
}
