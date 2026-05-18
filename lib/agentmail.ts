import { getCase, updateCase, audit } from "@/lib/store";
import type { SentEmail } from "@/lib/types";
import { v4 as uuid } from "uuid";
import { errorMessage, fetchWithTimeout } from "@/lib/http";

export async function sendCaseSummaryEmail(caseId: string, recipientEmail: string): Promise<SentEmail> {
  const record = await getCase(caseId);
  if (!record) throw new Error("Case not found");

  const subject = `Your Frontline AI Agent Summary - Case ${caseId}`;
  const body = [
    `Short summary\n${record.summary}`,
    `What we understood\n${JSON.stringify(record.extractedFields, null, 2)}`,
    `Next steps for customer/user\n${customerNextStep(record.nextAction)}`,
    `Next steps for business/team\n${record.nextAction}`,
    `Human follow-up required?\n${record.status === "escalated" || record.vertical === "compliance" ? "Yes" : "No"}`,
    `Structured extracted information\n${JSON.stringify(record.extractedFields, null, 2)}`,
    `Timestamp\n${new Date().toISOString()}`
  ].join("\n\n");

  let sent: SentEmail = {
    id: uuid(),
    provider: "mock",
    recipientEmail,
    subject,
    createdAt: new Date().toISOString()
  };

  if (process.env.AGENTMAIL_API_KEY) {
    try {
      const inboxId = await getOrCreateInboxId();
      const response = await fetchWithTimeout(`https://api.agentmail.to/v0/inboxes/${inboxId}/messages/send`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.AGENTMAIL_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          to: recipientEmail,
          subject,
          text: body,
          html: htmlEmail(record.summary, record.nextAction, record.extractedFields),
          labels: ["frontline-ai-agent", record.vertical]
        })
      });
      const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;
      if (!response.ok) throw new Error(providerError(data.error, response.statusText));
      sent = {
        ...sent,
        provider: "agentmail",
        providerMessageId:
          (data.message_id as string | undefined) ??
          (data.messageId as string | undefined) ??
          (data.id as string | undefined)
      };
    } catch (error) {
      sent.provider = "mock";
      sent.providerMessageId = `mock:${errorMessage(error)}`;
    }
  }

  await updateCase(caseId, (current) => ({
    ...current,
    email: recipientEmail,
    status: current.status === "closed" ? "closed" : "emailed",
    sentEmails: [sent, ...current.sentEmails],
    auditLogs: [
      audit(caseId, "agentmail.summary.sent", {
        provider: sent.provider,
        recipientEmail,
        subject,
        providerMessageId: sent.providerMessageId
      }),
      ...current.auditLogs
    ]
  }));

  return sent;
}

async function getOrCreateInboxId() {
  if (process.env.AGENTMAIL_INBOX_ID) return process.env.AGENTMAIL_INBOX_ID;
  const apiKey = process.env.AGENTMAIL_API_KEY;
  if (!apiKey) throw new Error("AGENTMAIL_API_KEY missing");

  const listResponse = await fetchWithTimeout("https://api.agentmail.to/v0/inboxes?limit=10", {
    headers: { Authorization: `Bearer ${apiKey}` }
  });
  const listData = (await listResponse.json().catch(() => ({}))) as {
    inboxes?: Array<{ inbox_id?: string; email?: string }>;
    error?: unknown;
  };
  if (!listResponse.ok) throw new Error(providerError(listData.error, listResponse.statusText));
  const existing = listData.inboxes?.[0]?.inbox_id ?? listData.inboxes?.[0]?.email;
  if (existing) return existing;

  const createResponse = await fetchWithTimeout("https://api.agentmail.to/v0/inboxes", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      username: `frontline-${Date.now().toString(36)}`,
      display_name: "Frontline AI Agent",
      client_id: "frontline-ai-agent-demo"
    })
  });
  const createData = (await createResponse.json().catch(() => ({}))) as {
    inbox_id?: string;
    email?: string;
    error?: unknown;
  };
  if (!createResponse.ok) throw new Error(providerError(createData.error, createResponse.statusText));
  const created = createData.inbox_id ?? createData.email;
  if (!created) throw new Error("AgentMail did not return inbox_id");
  return created;
}

function htmlEmail(summary: string, nextAction: string, extractedFields: Record<string, unknown>) {
  return `
    <div style="font-family:Inter,Arial,sans-serif;line-height:1.55;color:#0f172a">
      <h2>Your Frontline AI Agent Summary</h2>
      <p>${escapeHtml(summary)}</p>
      <h3>Next step</h3>
      <p>${escapeHtml(nextAction)}</p>
      <h3>Structured details</h3>
      <pre style="background:#f1f5f9;padding:12px;border-radius:10px;white-space:pre-wrap">${escapeHtml(JSON.stringify(extractedFields, null, 2))}</pre>
    </div>
  `;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
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

function customerNextStep(nextAction: string) {
  if (nextAction.toLowerCase().includes("book")) return "Watch for appointment confirmation and reply if the time no longer works.";
  if (nextAction.toLowerCase().includes("ticket")) return "Watch for the service ticket confirmation and provide photos if requested.";
  return "A human reviewer may follow up for additional documentation.";
}
