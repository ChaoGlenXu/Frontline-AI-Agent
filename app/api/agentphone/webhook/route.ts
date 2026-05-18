import { NextResponse } from "next/server";
import { parseAgentPhoneWebhook } from "@/lib/agentphone";
import { processInboundMessage } from "@/lib/caseProcessor";

export async function POST(request: Request) {
  const payload = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const parsed = parseAgentPhoneWebhook(payload);
  const webhookId = request.headers.get("x-webhook-id") ?? undefined;

  if (!parsed.text) {
    return NextResponse.json({ error: "Webhook did not include SMS text or voice transcript" }, { status: 400 });
  }

  try {
    const result = await processInboundMessage({
      caseId: parsed.caseId,
      phone: parsed.phone,
      content: parsed.text,
      channel: parsed.channel,
      providerMessageId: webhookId ?? parsed.providerMessageId,
      conversationId: parsed.conversationId,
      providerPayload: parsed.raw
    });

    if (parsed.channel === "voice") {
      return NextResponse.json({
        text: result.reply ?? "Done. I updated the case.",
        conversationState: {
          caseId: result.case?.id,
          status: result.case?.status,
          email: result.case?.email
        }
      });
    }

    return NextResponse.json({ ok: true, parsed, ...result });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to process AgentPhone webhook", parsed },
      { status: 404 }
    );
  }
}
