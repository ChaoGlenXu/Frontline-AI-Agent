import OpenAI from "openai";
import { errorMessage, fetchWithTimeout } from "@/lib/http";
import { searchMoss } from "@/lib/moss";
import { getSettings } from "@/lib/settings";
import { searchSupermemory, saveSupermemory } from "@/lib/supermemory";
import type { AgentDecision, AIProvider, CaseRecord, CaseStatus, Vertical } from "@/lib/types";

const requiredFields: Record<Vertical, string[]> = {
  dental: ["patientName", "preferredTime", "appointmentType", "bookingConfirmed", "email"],
  government: ["issue", "location", "category", "urgency"],
  compliance: ["customerName", "transactionPurpose", "kycDetails", "riskFactors", "riskLevel"]
};

const verticalPrompts: Record<Vertical, string> = {
  dental:
    "Dental recall agent. Answer basic insurance and scheduling questions from knowledge. Collect availability, propose only mock slots from context, request email, and escalate dental emergencies.",
  government:
    "Local government service agent. Answer resident questions from knowledge. Collect location, problem details, category, urgency, create ticket-ready data, and escalate emergencies.",
  compliance:
    "Compliance KYC/AML agent. Collect suspicious transaction details, summarize risks, create audit-ready review, and escalate legal/compliance decisions to a human."
};

export async function orchestrateAgentResponse(record: CaseRecord, inboundContent: string, channel: "sms" | "voice" | "chat" = "sms") {
  const userId = record.email ?? record.phone ?? record.id;
  const settings = await getSettings();
  const [retrievalSnippets, memoryResults] = await Promise.all([
    searchMoss(inboundContent, record.vertical, record.extractedFields),
    searchSupermemory(userId, `${record.vertical} ${inboundContent}`)
  ]);

  const decision = await decideWithProvider(settings.aiProvider, record, inboundContent, retrievalSnippets, memoryResults).catch(() =>
    fallbackDecision(record, inboundContent, retrievalSnippets, memoryResults)
  );
  const lower = inboundContent.toLowerCase();
  const recipientEmail = String(record.email ?? decision.extractedFields.email ?? "");
  if (recipientEmail && isEmailSendRequest(lower)) {
    decision.extractedFields.email = recipientEmail;
    decision.shouldSendEmail = true;
    decision.reply = `Done, I’ll send the confirmation email to ${recipientEmail}.`;
  }

  if (decision.shouldSaveMemory || decision.status === "booked" || decision.status === "ticket_created" || decision.status === "escalated") {
    await saveSupermemory(userId, `${record.vertical} case ${record.id}: ${decision.summary}`, {
      caseId: record.id,
      vertical: record.vertical,
      extractedFields: decision.extractedFields,
      channel
    });
  }

  return { decision, retrievalSnippets, memoryResults, aiProvider: settings.aiProvider };
}

async function decideWithProvider(
  provider: AIProvider,
  record: CaseRecord,
  inboundContent: string,
  retrievalSnippets: Awaited<ReturnType<typeof searchMoss>>,
  memoryResults: Awaited<ReturnType<typeof searchSupermemory>>
) {
  if (provider === "gemini") {
    return decideWithGemini(record, inboundContent, retrievalSnippets, memoryResults);
  }
  return decideWithOpenAI(record, inboundContent, retrievalSnippets, memoryResults);
}

async function decideWithOpenAI(
  record: CaseRecord,
  inboundContent: string,
  retrievalSnippets: Awaited<ReturnType<typeof searchMoss>>,
  memoryResults: Awaited<ReturnType<typeof searchSupermemory>>
): Promise<AgentDecision> {
  if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === "YOUR_OPENAI_API_KEY") {
    return fallbackDecision(record, inboundContent, retrievalSnippets, memoryResults);
  }

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const tools: OpenAI.Chat.Completions.ChatCompletionTool[] = [
    {
      type: "function",
      function: {
        name: "searchKnowledge",
        description: "Search Moss semantic knowledge for workflow policy or FAQ context.",
        parameters: {
          type: "object",
          properties: { query: { type: "string" }, vertical: { type: "string" } },
          required: ["query", "vertical"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "updateCase",
        description: "Patch case fields, status, summary, or next action.",
        parameters: { type: "object", properties: { patch: { type: "object" } }, required: ["patch"] }
      }
    },
    {
      type: "function",
      function: {
        name: "escalateToHuman",
        description: "Escalate emergencies or sensitive compliance/legal decisions.",
        parameters: { type: "object", properties: { reason: { type: "string" } }, required: ["reason"] }
      }
    }
  ];

  const response = await client.chat.completions.create({
    model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
    response_format: { type: "json_object" },
    tools,
    tool_choice: "auto",
    messages: [
      {
        role: "system",
        content: `You are Frontline AI Agent. ${verticalPrompts[record.vertical]}
Return only JSON with keys: intent, extractedFields, missingFields, riskLevel, summary, nextAction, reply, status, shouldSendEmail, shouldSaveMemory, humanFollowUpRequired.
Rules: ask one question at a time; SMS replies under 320 characters; continuously extract fields; avoid hallucinating availability; use provided knowledge and memory; escalate emergencies and compliance decisions. Valid statuses: new, in_progress, booked, ticket_created, escalated, emailed, closed.
Required fields: ${requiredFields[record.vertical].join(", ")}.`
      },
      {
        role: "user",
        content: JSON.stringify({
          case: record,
          latestMessage: inboundContent,
          relevantKnowledge: retrievalSnippets,
          relevantMemory: memoryResults,
          availableMockTools: [
            "sendSummaryEmail(caseId,email)",
            "proposeAppointmentSlots(vertical,availability)",
            "createServiceTicket(issue,location,urgency)",
            "createComplianceReview(details,riskLevel)"
          ]
        })
      }
    ]
  });

  const raw = response.choices[0]?.message.content;
  if (!raw) return fallbackDecision(record, inboundContent, retrievalSnippets, memoryResults);
  const parsed = JSON.parse(raw) as Partial<AgentDecision>;
  const fallback = fallbackDecision(record, inboundContent, retrievalSnippets, memoryResults);
  return mergeDecision(parsed, fallback);
}

async function decideWithGemini(
  record: CaseRecord,
  inboundContent: string,
  retrievalSnippets: Awaited<ReturnType<typeof searchMoss>>,
  memoryResults: Awaited<ReturnType<typeof searchSupermemory>>
): Promise<AgentDecision> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "YOUR_GEMINI_API_KEY") {
    return fallbackDecision(record, inboundContent, retrievalSnippets, memoryResults);
  }

  const model = process.env.GEMINI_MODEL ?? "gemini-1.5-flash";
  const prompt = `You are Frontline AI Agent. ${verticalPrompts[record.vertical]}
Return only strict JSON with keys: intent, extractedFields, missingFields, riskLevel, summary, nextAction, reply, status, shouldSendEmail, shouldSaveMemory, humanFollowUpRequired.
Rules: ask one question at a time; keep SMS replies under 320 characters; continuously extract fields; avoid hallucinating availability; use provided knowledge and memory; escalate emergencies and compliance decisions.
Valid statuses: new, in_progress, booked, ticket_created, escalated, emailed, closed.
Required fields: ${requiredFields[record.vertical].join(", ")}.

Input:
${JSON.stringify({
  case: record,
  latestMessage: inboundContent,
  relevantKnowledge: retrievalSnippets,
  relevantMemory: memoryResults
})}`;

  const response = await fetchWithTimeout(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.2
        }
      })
    },
    5000
  );

  const data = (await response.json().catch(() => ({}))) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    error?: { message?: string };
  };
  if (!response.ok) throw new Error(data.error?.message ?? response.statusText);
  const raw = data.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("") ?? "";
  if (!raw) return fallbackDecision(record, inboundContent, retrievalSnippets, memoryResults);

  try {
    return mergeDecision(JSON.parse(raw) as Partial<AgentDecision>, fallbackDecision(record, inboundContent, retrievalSnippets, memoryResults));
  } catch (error) {
    throw new Error(`Gemini returned invalid JSON: ${errorMessage(error)}`);
  }
}

function mergeDecision(parsed: Partial<AgentDecision>, fallback: AgentDecision): AgentDecision {
  return {
    intent: parsed.intent ?? fallback.intent,
    extractedFields: { ...fallback.extractedFields, ...(parsed.extractedFields ?? {}) },
    missingFields: parsed.missingFields ?? fallback.missingFields,
    riskLevel: parsed.riskLevel ?? fallback.riskLevel,
    summary: parsed.summary ?? fallback.summary,
    nextAction: parsed.nextAction ?? fallback.nextAction,
    reply: parsed.reply ?? fallback.reply,
    status: parsed.status ?? fallback.status,
    shouldSendEmail: parsed.shouldSendEmail ?? fallback.shouldSendEmail,
    shouldSaveMemory: parsed.shouldSaveMemory ?? true,
    humanFollowUpRequired: parsed.humanFollowUpRequired ?? fallback.humanFollowUpRequired
  };
}

function fallbackDecision(
  record: CaseRecord,
  inboundContent: string,
  retrievalSnippets: Awaited<ReturnType<typeof searchMoss>>,
  memoryResults: Awaited<ReturnType<typeof searchSupermemory>>
): AgentDecision {
  const extractedFields = { ...record.extractedFields };
  const lower = inboundContent.toLowerCase();
  const email = extractEmail(inboundContent);
  if (email) extractedFields.email = email;
  if (record.email && isEmailSendRequest(lower)) {
    extractedFields.email = record.email;
  } else if (!extractedFields.email && record.email && hasAny(lower, ["email", "confirmation", "confirm", "send it", "send the summary"])) {
    extractedFields.email = record.email;
  }

  if (record.vertical === "dental") {
    extractedFields.patientName ||= record.contactName;
    extractedFields.appointmentType ||= hasAny(lower, ["cleaning", "checkup", "check-up"]) ? "routine cleaning" : "routine cleaning";
    extractedFields.preferredTime ||= inboundContent.match(/\b(?:mon|tue|wed|thu|fri|sat|sun)[a-z]*[^.!,;]*/i)?.[0];
    if (hasAny(lower, ["insurance", "delta", "aetna", "cigna"])) extractedFields.insuranceQuestionAnswered = true;
    if (hasAny(lower, ["pain", "swelling", "fever", "bleeding", "trauma"])) {
      extractedFields.emergencySignal = inboundContent;
      return completed(record, extractedFields, "emergency_escalation", "Dental emergency signal detected. Human escalation required.", "Escalate to emergency dental line", "escalated", "This may need urgent care. I’m escalating you to the dental team now. If symptoms are severe, call emergency services.");
    }
    extractedFields.proposedSlots ||= ["Tuesday 2:30 PM", "Thursday 10:00 AM", "Friday 3:30 PM"];
    extractedFields.bookingConfirmed ||= hasAny(lower, ["yes", "book", "works", "confirm", "send confirmation"]) && Boolean(extractedFields.preferredTime);
  }

  if (record.vertical === "government") {
    extractedFields.issue ||= inboundContent;
    extractedFields.category ||= inferGovernmentCategory(lower);
    extractedFields.location ||= inboundContent.match(/\b(?:at|near|on)\s+([A-Za-z0-9 .&-]{4,})/i)?.[1]?.trim();
    extractedFields.urgency ||= hasAny(lower, ["danger", "blocked", "injury", "urgent", "hazard", "swerving"]) ? "high" : "normal";
    if (hasAny(lower, ["fire", "gas leak", "violence", "medical emergency"])) {
      return completed(record, extractedFields, "emergency_escalation", "Government emergency signal detected. Human escalation required.", "Escalate to emergency services", "escalated", "That sounds urgent. Please call emergency services now. I’m also escalating this report for human review.");
    }
  }

  if (record.vertical === "compliance") {
    extractedFields.customerName ||= record.contactName;
    extractedFields.transactionPurpose ||= inboundContent;
    extractedFields.kycDetails ||= hasAny(lower, ["invoice", "contract", "owner", "beneficiary", "sender", "unknown"]) ? inboundContent : undefined;
    extractedFields.riskFactors ||= [
      ...(Array.isArray(extractedFields.initialFlags) ? extractedFields.initialFlags : []),
      ...(hasAny(lower, ["unknown", "cash", "withdrawal", "9800", "third party", "large"]) ? ["new suspicious detail from intake"] : [])
    ];
    extractedFields.riskLevel ||= classifyRisk(extractedFields.riskFactors as unknown[]);
  }

  const missingFields = requiredFields[record.vertical].filter((field) => !extractedFields[field]);
  const ready = missingFields.length === 0;
  const status = ready ? readyStatus(record.vertical, extractedFields) : "in_progress";
  const memoryPrefix = memoryResults.length ? "I see prior context on file. " : "";
  const knowledgeHint = retrievalSnippets[0]?.content;
  const reply = ready ? readyReply(record.vertical, extractedFields) : `${memoryPrefix}${questionFor(missingFields[0], knowledgeHint)}`;

  return {
    intent: inferIntent(record.vertical, lower),
    extractedFields,
    missingFields,
    riskLevel: extractedFields.riskLevel as AgentDecision["riskLevel"],
    summary: summarize(record.vertical, extractedFields, missingFields),
    nextAction: ready ? readyAction(record.vertical) : `Ask for ${missingFields[0]}`,
    reply,
    status,
    shouldSendEmail: Boolean(extractedFields.email && ready),
    shouldSaveMemory: ready,
    humanFollowUpRequired: record.vertical === "compliance"
  };
}

function completed(
  record: CaseRecord,
  extractedFields: Record<string, unknown>,
  intent: string,
  summary: string,
  nextAction: string,
  status: CaseStatus,
  reply: string
): AgentDecision {
  return {
    intent,
    extractedFields,
    missingFields: [],
    riskLevel: record.vertical === "compliance" ? "high" : undefined,
    summary,
    nextAction,
    reply,
    status,
    shouldSaveMemory: true,
    humanFollowUpRequired: true
  };
}

function hasAny(text: string, terms: string[]) {
  return terms.some((term) => text.includes(term));
}

function isEmailSendRequest(text: string) {
  return hasAny(text, [
    "send confirmation",
    "send the confirmation",
    "send a confirmation",
    "email confirmation",
    "confirmation email",
    "send email",
    "send the email",
    "send it now",
    "send it to me",
    "send the summary",
    "email me",
    "to my email"
  ]);
}

function extractEmail(content: string) {
  const direct = content.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0];
  if (direct) return direct;

  const spoken = content
    .toLowerCase()
    .replace(/\s+at\s+/g, "@")
    .replace(/\s+dot\s+/g, ".")
    .replace(/\s+period\s+/g, ".")
    .replace(/\s+/g, "");
  return spoken.match(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/)?.[0];
}

function inferGovernmentCategory(text: string) {
  if (hasAny(text, ["pothole", "road", "street"])) return "Pothole";
  if (hasAny(text, ["graffiti", "tag"])) return "Graffiti";
  if (hasAny(text, ["light", "lamp", "dark"])) return "Streetlight outage";
  if (hasAny(text, ["dump", "trash", "garbage"])) return "Illegal dumping";
  if (hasAny(text, ["tree", "branch"])) return "Tree hazard";
  if (hasAny(text, ["water", "bill"])) return "Water billing";
  if (hasAny(text, ["permit"])) return "Permit question";
  return undefined;
}

function classifyRisk(factors: unknown[]) {
  const count = factors.filter(Boolean).length;
  if (count >= 3) return "high";
  if (count >= 1) return "medium";
  return "low";
}

function inferIntent(vertical: Vertical, text: string) {
  if (vertical === "dental") return hasAny(text, ["book", "yes", "schedule", "insurance"]) ? "dental_recall" : "dental_intake";
  if (vertical === "government") return "create_service_request";
  return "create_compliance_review";
}

function readyStatus(vertical: Vertical, extractedFields: Record<string, unknown>): CaseStatus {
  if (vertical === "dental" && extractedFields.bookingConfirmed) return "booked";
  if (vertical === "government") return "ticket_created";
  if (vertical === "compliance") return "escalated";
  return "in_progress";
}

function readyAction(vertical: Vertical) {
  if (vertical === "dental") return "Mark booked and email appointment summary";
  if (vertical === "government") return "Create city service ticket and send summary";
  return "Create audit-ready compliance review and hand off to human";
}

function readyReply(vertical: Vertical, extractedFields: Record<string, unknown>) {
  if (vertical === "dental") return `Thanks. I can request ${String(extractedFields.preferredTime ?? "that slot")}. What email should we send the summary to?`;
  if (vertical === "government") return "Thanks, I have enough to create the service ticket and route it to the right team.";
  return "I found risk signals and prepared an audit summary. I’m escalating this for human compliance review.";
}

function questionFor(field: string | undefined, knowledgeHint?: string) {
  const prefix = knowledgeHint && field === "preferredTime" ? "BrightSmile has Tuesday 2:30 PM, Thursday 10:00 AM, or Friday 3:30 PM. " : "";
  const questions: Record<string, string> = {
    preferredTime: `${prefix}What day and time would work best?`,
    appointmentType: "Is this for a routine cleaning or a specific dental concern?",
    bookingConfirmed: "Should I go ahead and request that booking?",
    email: "What email should we send the summary to?",
    issue: "What issue would you like to report?",
    location: "What is the exact location or nearest cross street?",
    category: "Which category fits best: pothole, graffiti, streetlight, dumping, tree hazard, water billing, or permit?",
    urgency: "Is this urgent or creating an immediate safety risk?",
    transactionPurpose: "What is the business purpose or explanation for the transaction?",
    kycDetails: "What KYC support is available, such as invoice, contract, owner, sender, or beneficiary details?",
    riskFactors: "Are there any additional unusual details or red flags?",
    riskLevel: "Should this be treated as low, medium, or high risk pending human review?"
  };
  return questions[field ?? ""] ?? "Can you share one more detail so I can finish the case?";
}

function summarize(vertical: Vertical, extractedFields: Record<string, unknown>, missingFields: string[]) {
  const complete = missingFields.length === 0 ? "Complete" : `Missing ${missingFields.join(", ")}`;
  if (vertical === "dental") return `${complete}. Dental recall for ${extractedFields.patientName ?? "patient"}; preferred time ${extractedFields.preferredTime ?? "pending"}.`;
  if (vertical === "government") return `${complete}. Government request: ${extractedFields.category ?? "uncategorized"} at ${extractedFields.location ?? "unknown location"}.`;
  return `${complete}. Compliance review for ${extractedFields.customerName ?? "customer"} classified ${extractedFields.riskLevel ?? "pending"} risk.`;
}
