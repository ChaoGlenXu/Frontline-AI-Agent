import { NextResponse } from "next/server";
import { saveSupermemory } from "@/lib/supermemory";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    userId?: string;
    content?: string;
    metadata?: Record<string, unknown>;
  };
  if (!body.userId || !body.content) {
    return NextResponse.json({ error: "userId and content are required" }, { status: 400 });
  }
  const memory = await saveSupermemory(body.userId, body.content, body.metadata ?? {});
  return NextResponse.json({ ok: true, memory });
}
