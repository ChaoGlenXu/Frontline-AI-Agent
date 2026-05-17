export type Vertical = "dental" | "government" | "compliance";
export type LegacyVertical = Vertical | "city";

export type CaseStatus =
  | "new"
  | "in_progress"
  | "booked"
  | "ticket_created"
  | "escalated"
  | "emailed"
  | "closed";

export type Channel = "sms" | "voice" | "chat" | "email";
export type MessageRole = "user" | "assistant" | "system";

export type Message = {
  id: string;
  caseId: string;
  role: MessageRole;
  channel: Channel;
  content: string;
  providerMessageId?: string;
  createdAt: string;
};

export type AuditLog = {
  id: string;
  caseId: string;
  eventType: string;
  details: Record<string, unknown>;
  createdAt: string;
};

export type RetrievalSnippet = {
  id: string;
  source: "moss" | "mock";
  title: string;
  content: string;
  score?: number;
  createdAt: string;
};

export type MemoryResult = {
  id: string;
  source: "supermemory" | "local";
  content: string;
  metadata?: Record<string, unknown>;
  score?: number;
  createdAt: string;
};

export type SentEmail = {
  id: string;
  provider: "agentmail" | "mock";
  recipientEmail: string;
  subject: string;
  providerMessageId?: string;
  createdAt: string;
};

export type SponsorStatus = {
  name: "AgentPhone" | "AgentMail" | "Moss" | "Supermemory" | "OpenAI" | "Gemini";
  configured: boolean;
  lastStatus: "ready" | "mock" | "ok" | "error";
  detail: string;
  checkedAt: string;
};

export type AIProvider = "openai" | "gemini";

export type AppSettings = {
  aiProvider: AIProvider;
  updatedAt: string;
};

export type CaseRecord = {
  id: string;
  vertical: Vertical;
  status: CaseStatus;
  contactName?: string;
  phone?: string;
  email?: string;
  title: string;
  intent: string;
  summary: string;
  nextAction: string;
  riskLevel?: "low" | "medium" | "high";
  extractedFields: Record<string, unknown>;
  missingFields: string[];
  messages: Message[];
  auditLogs: AuditLog[];
  retrievalSnippets: RetrievalSnippet[];
  memoryResults: MemoryResult[];
  sentEmails: SentEmail[];
  processedProviderMessageIds: string[];
  providerConversationIds: string[];
  createdAt: string;
  updatedAt: string;
};

export type DemoScenario = {
  vertical: Vertical;
  contactName: string;
  phone: string;
  email?: string;
  title: string;
  seedExtractedFields: Record<string, unknown>;
  firstMessage: string;
};

export type AgentDecision = {
  intent: string;
  extractedFields: Record<string, unknown>;
  missingFields: string[];
  riskLevel?: "low" | "medium" | "high";
  summary: string;
  nextAction: string;
  reply: string;
  status: CaseStatus;
  shouldSendEmail?: boolean;
  shouldSaveMemory?: boolean;
  humanFollowUpRequired?: boolean;
};

export function normalizeVertical(vertical: LegacyVertical): Vertical {
  return vertical === "city" ? "government" : vertical;
}
