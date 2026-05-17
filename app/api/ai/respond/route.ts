import { NextResponse } from "next/server";
import { processInboundMessage } from "@/lib/caseProcessor";

type RespondBody = {
  caseId?: string;
  message?: string;
};

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as RespondBody;
  if (!body.caseId || !body.message) {
    return NextResponse.json({ error: "caseId and message are required" }, { status: 400 });
  }

  try {
    const result = await processInboundMessage({
      caseId: body.caseId,
      content: body.message,
      channel: "chat"
    });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to respond" }, { status: 404 });
  }
}
