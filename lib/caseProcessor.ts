import { orchestrateAgentResponse } from "@/lib/agent";
import { sendCaseSummaryEmail } from "@/lib/agentmail";
import { sendAgentPhoneSms } from "@/lib/agentphone";
import { audit, getCase, message, readCases, updateCase } from "@/lib/store";
import type { CaseRecord } from "@/lib/types";

export async function findCaseForInbound(caseId?: string, phone?: string): Promise<CaseRecord | undefined> {
  if (caseId) return getCase(caseId);
  if (!phone) return undefined;
  const cases = await readCases();
  return cases.find((item) => item.phone === phone && item.status !== "closed");
}

export async function processInboundMessage(input: {
  caseId?: string;
  phone?: string;
  content: string;
  channel: "sms" | "voice" | "chat";
  providerMessageId?: string;
  conversationId?: string;
  providerPayload?: Record<string, unknown>;
}) {
  const record = await findCaseForInbound(input.caseId, input.phone);
  if (!record) throw new Error("No matching case for inbound message");

  if (input.providerMessageId && record.processedProviderMessageIds.includes(input.providerMessageId)) {
    return { duplicate: true, case: record, reply: undefined };
  }

  const withInbound = await updateCase(record.id, (current) => ({
    ...current,
    status: current.status === "new" ? "in_progress" : current.status,
    phone: input.phone ?? current.phone,
    messages: [
      message(current.id, "user", input.content, input.channel, input.providerMessageId),
      ...current.messages
    ],
    processedProviderMessageIds: input.providerMessageId
      ? [input.providerMessageId, ...current.processedProviderMessageIds]
      : current.processedProviderMessageIds,
    providerConversationIds:
      input.conversationId && !current.providerConversationIds.includes(input.conversationId)
        ? [input.conversationId, ...current.providerConversationIds]
        : current.providerConversationIds,
    auditLogs: [
      audit(current.id, "inbound.message.received", {
        channel: input.channel,
        phone: input.phone ?? current.phone,
        providerMessageId: input.providerMessageId,
        conversationId: input.conversationId,
        providerPayload: input.providerPayload
      }),
      ...current.auditLogs
    ]
  }));

  if (!withInbound) throw new Error("Case not found after inbound update");

  const { decision, retrievalSnippets, memoryResults, aiProvider } = await orchestrateAgentResponse(
    withInbound,
    input.content,
    input.channel
  );
  const explicitEmailRequest = isExplicitEmailRequest(input.content);
  const willSendEmail = Boolean(
    decision.shouldSendEmail &&
      String(explicitEmailRequest ? (withInbound.email ?? decision.extractedFields.email ?? "") : (decision.extractedFields.email ?? withInbound.email ?? ""))
  );

  const sendResult =
    input.channel === "sms" && withInbound.phone
      ? await sendAgentPhoneSms(withInbound.phone, decision.reply)
      : { ok: true, provider: "mock" as const, detail: "Non-SMS channel; no AgentPhone send required." };

  let updated = await updateCase(withInbound.id, (current) => ({
    ...current,
    status: decision.status,
    intent: decision.intent,
    extractedFields: decision.extractedFields,
    email: String(decision.extractedFields.email ?? current.email ?? "") || undefined,
    missingFields: decision.missingFields,
    riskLevel: decision.riskLevel,
    summary: decision.summary,
    nextAction: decision.nextAction,
    messages:
      input.channel === "voice" && willSendEmail
        ? current.messages
        : [message(current.id, "assistant", decision.reply, input.channel, sendResult.providerMessageId), ...current.messages],
    retrievalSnippets: [...retrievalSnippets, ...current.retrievalSnippets].slice(0, 12),
    memoryResults: [...memoryResults, ...current.memoryResults].slice(0, 12),
    auditLogs: [
      audit(current.id, "openai.orchestration.completed", {
        intent: decision.intent,
        status: decision.status,
        missingFields: decision.missingFields,
        nextAction: decision.nextAction,
        aiProvider,
        usedOpenAI: aiProvider === "openai" && Boolean(process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== "YOUR_OPENAI_API_KEY"),
        usedGemini: aiProvider === "gemini" && Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== "YOUR_GEMINI_API_KEY"),
        mossSnippets: retrievalSnippets.length,
        memoryResults: memoryResults.length
      }),
      audit(current.id, "agentphone.outbound.processed", sendResult),
      ...current.auditLogs
    ]
  }));

  const recipientEmail = String(
    explicitEmailRequest ? (updated?.email ?? decision.extractedFields.email ?? "") : (decision.extractedFields.email ?? updated?.email ?? "")
  );
  let reply = decision.reply;
  if (updated && decision.shouldSendEmail && recipientEmail) {
    const sent = await sendCaseSummaryEmail(updated.id, recipientEmail);
    if (input.channel === "voice" || explicitEmailRequest) {
      reply =
        sent.provider === "agentmail"
          ? `Done, I sent the confirmation email to ${recipientEmail}.`
          : `I saved the confirmation for ${recipientEmail}. The email provider fallback was used, so the dashboard has the audit record.`;
      await updateCase(updated.id, (current) => ({
        ...current,
        messages: [message(current.id, "assistant", reply, input.channel, sent.providerMessageId), ...current.messages],
        auditLogs: [
          audit(current.id, "agentmail.voice_confirmation.reply", {
            provider: sent.provider,
            recipientEmail,
            providerMessageId: sent.providerMessageId
          }),
          ...current.auditLogs
        ]
      }));
    }
    updated = await getCase(updated.id);
  }

  return { duplicate: false, case: updated, reply, decision, sendResult };
}

function isExplicitEmailRequest(content: string) {
  const lower = content.toLowerCase();
  return ["send confirmation", "send the confirmation", "email confirmation", "send email", "send the email", "email me", "send the summary"].some((term) =>
    lower.includes(term)
  );
}
