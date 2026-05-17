import { NextResponse } from "next/server";
import { searchSupermemory } from "@/lib/supermemory";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { userId?: string; query?: string };
  if (!body.userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }
  const results = await searchSupermemory(body.userId, body.query ?? "");
  return NextResponse.json({ results });
}
