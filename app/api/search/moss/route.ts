import { NextResponse } from "next/server";
import { searchMoss } from "@/lib/moss";
import { normalizeVertical, type LegacyVertical } from "@/lib/types";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    query?: string;
    vertical?: LegacyVertical;
    extractedFields?: Record<string, unknown>;
  };
  const results = await searchMoss(body.query ?? "", normalizeVertical(body.vertical ?? "dental"), body.extractedFields ?? {});
  return NextResponse.json({ results });
}
