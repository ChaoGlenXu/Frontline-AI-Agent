import { NextResponse } from "next/server";
import { demoScenarios } from "@/lib/mockData";
import { createCase } from "@/lib/store";
import { normalizeVertical, type LegacyVertical } from "@/lib/types";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { vertical?: LegacyVertical };
  const vertical = normalizeVertical(body.vertical ?? "dental");
  const scenario = demoScenarios[vertical];

  if (!scenario) {
    return NextResponse.json({ error: "Unknown demo vertical" }, { status: 400 });
  }

  const record = await createCase(scenario);
  return NextResponse.json({ case: record });
}
