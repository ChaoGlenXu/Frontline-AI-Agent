import { errorMessage, fetchWithTimeout } from "@/lib/http";

type AgentPhoneSendResult = {
  ok: boolean;
  provider: "agentphone" | "mock";
  providerMessageId?: string;
  detail: string;
};

export type AgentPhoneCallResult = {
  ok: boolean;
  provider: "agentphone" | "mock";
  providerCallId?: string;
  detail: string;
};

export type AgentPhoneWebhookPayload = {
  phone?: string;
  text?: string;
  caseId?: string;
  conversationId?: string;
  providerMessageId?: string;
  channel: "sms" | "voice";
  eventType: string;
  raw: Record<string, unknown>;
};

export function parseAgentPhoneWebhook(payload: Record<string, unknown>): AgentPhoneWebhookPayload {
  const nested = (payload.message ?? payload.sms ?? payload.call ?? {}) as Record<string, unknown>;
  const data = (payload.data ?? {}) as Record<string, unknown>;
  const metadata = (data.metadata ?? payload.metadata ?? payload.conversationState ?? {}) as Record<string, unknown>;
  const phone =
    (payload.from as string | undefined) ??
    (payload.phone as string | undefined) ??
    (data.from as string | undefined) ??
    (data.phone as string | undefined) ??
    (data.phone_number as string | undefined) ??
    (nested.from as string | undefined) ??
    (nested.phone_number as string | undefined);
  const text =
    (payload.body as string | undefined) ??
    (payload.text as string | undefined) ??
    (payload.transcript as string | undefined) ??
    (data.message as string | undefined) ??
    (data.body as string | undefined) ??
    (data.text as string | undefined) ??
    (data.transcript as string | undefined) ??
    (nested.body as string | undefined) ??
    (nested.text as string | undefined) ??
    (nested.transcript as string | undefined);
  const eventType = String(payload.type ?? payload.event ?? payload.eventType ?? "message.received");
  const channelValue = String(payload.channel ?? data.channel ?? nested.channel ?? "");
  const channel = eventType.includes("voice") || channelValue === "voice" || Boolean(payload.transcript ?? data.transcript) ? "voice" : "sms";

  return {
    phone,
    text,
    caseId:
      (metadata.caseId as string | undefined) ??
      (payload.caseId as string | undefined) ??
      (data.caseId as string | undefined),
    conversationId:
      (payload.conversationId as string | undefined) ??
      (payload.conversation_id as string | undefined) ??
      (data.conversationId as string | undefined) ??
      (data.conversation_id as string | undefined) ??
      (nested.conversation_id as string | undefined),
    providerMessageId:
      (payload.providerMessageId as string | undefined) ??
      (payload.messageId as string | undefined) ??
      (payload.id as string | undefined) ??
      (data.providerMessageId as string | undefined) ??
      (data.messageId as string | undefined) ??
      (data.id as string | undefined) ??
      (data.callId as string | undefined) ??
      (nested.id as string | undefined),
    channel,
    eventType,
    raw: payload
  };
}

export async function sendAgentPhoneSms(to: string, body: string): Promise<AgentPhoneSendResult> {
  const apiKey = process.env.AGENTPHONE_API_KEY;
  if (!apiKey) {
    return { ok: true, provider: "mock", detail: "AGENTPHONE_API_KEY missing; mocked outbound SMS." };
  }

  try {
    const response = await fetchWithTimeout("https://api.agentphone.ai/v1/messages", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ to, body, channel: "sms" })
    });
    const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    if (!response.ok) throw new Error(providerError(data.error, response.statusText));
    return {
      ok: true,
      provider: "agentphone",
      providerMessageId: (data.id as string | undefined) ?? (data.messageId as string | undefined),
      detail: "Sent through AgentPhone."
    };
  } catch (error) {
    return {
      ok: true,
      provider: "mock",
      detail: `AgentPhone failed; mocked outbound SMS. ${errorMessage(error)}`
    };
  }
}

export async function startAgentPhoneCall(input: {
  to: string;
  script: string;
  caseId: string;
  vertical: "dental" | "government";
  agentId?: string;
  initialGreeting?: string;
}): Promise<AgentPhoneCallResult> {
  const apiKey = process.env.AGENTPHONE_API_KEY;
  if (!apiKey) {
    return { ok: true, provider: "mock", detail: "AGENTPHONE_API_KEY missing; mocked outbound voice call." };
  }
  const agentId = input.agentId ?? process.env.AGENTPHONE_AGENT_ID;
  if (!agentId) {
    return { ok: true, provider: "mock", detail: "AGENTPHONE_AGENT_ID missing; mocked outbound voice call." };
  }

  try {
    await ensureWebhookVoiceAgent(agentId, input.script, input.initialGreeting);
    const response = await fetchWithTimeout(
      "https://api.agentphone.ai/v1/calls",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          agentId,
          toNumber: input.to,
          systemPrompt: input.script,
          initialGreeting: input.initialGreeting ?? "Hi, this is Frontline AI. I’m calling to help with your request.",
          metadata: { caseId: input.caseId, vertical: input.vertical }
        })
      },
      5000
    );
    const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    if (!response.ok) throw new Error(providerError(data.error, response.statusText));
    return {
      ok: true,
      provider: "agentphone",
      providerCallId: (data.id as string | undefined) ?? (data.callId as string | undefined),
      detail: "Outbound voice call started through AgentPhone."
    };
  } catch (error) {
    return {
      ok: true,
      provider: "mock",
      detail: `AgentPhone call failed; mocked outbound voice call. ${errorMessage(error)}`
    };
  }
}

async function ensureWebhookVoiceAgent(agentId: string, script: string, initialGreeting?: string) {
  const apiKey = process.env.AGENTPHONE_API_KEY;
  if (!apiKey) return;

  await fetchWithTimeout(
    `https://api.agentphone.ai/v1/agents/${agentId}`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        voiceMode: "webhook",
        systemPrompt: script,
        beginMessage: initialGreeting
      })
    },
    5000
  ).catch(() => undefined);
}

function providerError(error: unknown, fallback: string) {
  if (!error) return fallback;
  if (typeof error === "string") return error;
  if (typeof error === "object" && "message" in error && typeof error.message === "string") return error.message;
  try {
    return JSON.stringify(error);
  } catch {
    return fallback;
  }
}
