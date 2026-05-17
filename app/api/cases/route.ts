import { NextResponse } from "next/server";
import { readCases } from "@/lib/store";
import { sponsorStatuses } from "@/lib/status";

export async function GET() {
  const cases = await readCases();
  return NextResponse.json({ cases, sponsorStatuses: sponsorStatuses() });
}
