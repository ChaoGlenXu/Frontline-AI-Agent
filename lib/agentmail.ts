import { getCase, updateCase, audit } from "@/lib/store";
import type { SentEmail } from "@/lib/types";
import { v4 as uuid } from "uuid";
import { fetchWithTimeout } from "@/lib/http";

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
      const response = await fetchWithTimeout("https://api.agentmail.to/v1/send", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.AGENTMAIL_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          to: recipientEmail,
          subject,
          text: body
        })
      });
      const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;
      if (!response.ok) throw new Error(String(data.error ?? response.statusText));
      sent = {
        ...sent,
        provider: "agentmail",
        providerMessageId: (data.id as string | undefined) ?? (data.messageId as string | undefined)
      };
    } catch {
      sent.provider = "mock";
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

function customerNextStep(nextAction: string) {
  if (nextAction.toLowerCase().includes("book")) return "Watch for appointment confirmation and reply if the time no longer works.";
  if (nextAction.toLowerCase().includes("ticket")) return "Watch for the service ticket confirmation and provide photos if requested.";
  return "A human reviewer may follow up for additional documentation.";
}
