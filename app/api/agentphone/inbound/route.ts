import { NextResponse } from "next/server";
import { processInboundMessage } from "@/lib/caseProcessor";

type InboundBody = {
  caseId?: string;
  from?: string;
  body?: string;
  text?: string;
  message?: string;
};

export async function POST(request: Request) {
  const payload = (await request.json().catch(() => ({}))) as InboundBody;
  const inboundText = payload.body ?? payload.text ?? payload.message;

  if (!inboundText) {
    return NextResponse.json({ error: "body, text, or message is required" }, { status: 400 });
  }

  try {
    const result = await processInboundMessage({
      caseId: payload.caseId,
      phone: payload.from,
      content: inboundText,
      channel: "sms"
    });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "No matching case" }, { status: 404 });
  }
}
