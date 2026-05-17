import { NextResponse } from "next/server";
import { getSettings, updateSettings } from "@/lib/settings";
import type { AIProvider } from "@/lib/types";

export async function GET() {
  const settings = await getSettings();
  return NextResponse.json({ settings });
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { aiProvider?: AIProvider };
  if (body.aiProvider !== "openai" && body.aiProvider !== "gemini") {
    return NextResponse.json({ error: "aiProvider must be openai or gemini" }, { status: 400 });
  }
  const settings = await updateSettings({ aiProvider: body.aiProvider });
  return NextResponse.json({ settings });
}
