import { NextResponse } from "next/server";
import { processInboundMessage } from "@/lib/caseProcessor";

type ChatBody = {
  caseId?: string;
  phone?: string;
  message?: string;
};

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as ChatBody;
  if (!body.message) {
    return NextResponse.json({ error: "message is required" }, { status: 400 });
  }

  try {
    const result = await processInboundMessage({
      caseId: body.caseId,
      phone: body.phone,
      content: body.message,
      channel: "chat"
    });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to process chat" }, { status: 404 });
  }
}
