import { NextResponse } from "next/server";
import { parseAgentPhoneWebhook } from "@/lib/agentphone";
import { processInboundMessage } from "@/lib/caseProcessor";

export async function POST(request: Request) {
  const payload = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const parsed = parseAgentPhoneWebhook(payload);

  if (!parsed.text) {
    return NextResponse.json({ error: "Webhook did not include SMS text or voice transcript" }, { status: 400 });
  }

  try {
    const result = await processInboundMessage({
      phone: parsed.phone,
      content: parsed.text,
      channel: parsed.channel,
      providerMessageId: parsed.providerMessageId,
      conversationId: parsed.conversationId,
      providerPayload: parsed.raw
    });
    return NextResponse.json({ ok: true, parsed, ...result });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to process AgentPhone webhook", parsed },
      { status: 404 }
    );
  }
}
