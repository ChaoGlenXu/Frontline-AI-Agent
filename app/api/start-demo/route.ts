import { NextResponse } from "next/server";
import { demoScenarios } from "@/lib/mockData";
import { createCase } from "@/lib/store";
import { normalizeVertical, type LegacyVertical } from "@/lib/types";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    vertical?: LegacyVertical;
    contactName?: string;
    phone?: string;
    email?: string;
  };
  const vertical = normalizeVertical(body.vertical ?? "dental");
  const scenario = demoScenarios[vertical];

  if (!scenario) {
    return NextResponse.json({ error: "Unknown demo vertical" }, { status: 400 });
  }

  const customScenario = {
    ...scenario,
    contactName: body.contactName?.trim() || scenario.contactName,
    phone: body.phone?.trim() || scenario.phone,
    email: body.email?.trim() || scenario.email
  };
  const record = await createCase(customScenario);
  return NextResponse.json({ case: record });
}
