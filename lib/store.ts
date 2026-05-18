import { promises as fs } from "fs";
import path from "path";
import { v4 as uuid } from "uuid";
import type {
  AuditLog,
  CaseRecord,
  DemoScenario,
  MemoryResult,
  Message,
  RetrievalSnippet,
  SentEmail
} from "@/lib/types";
import { normalizeVertical } from "@/lib/types";
import { hasUpstash, redisGet, redisSetJson } from "@/lib/upstash";

const sourceDataDir = path.join(process.cwd(), "data");
const writableDataDir = process.env.VERCEL ? path.join("/tmp", "frontline-ai-agent") : sourceDataDir;
const casesPath = path.join(writableDataDir, "cases.json");
const memoryPath = path.join(writableDataDir, "memory.json");
const sourceCasesPath = path.join(sourceDataDir, "cases.json");
const sourceMemoryPath = path.join(sourceDataDir, "memory.json");
const casesKey = "frontline:cases";
const memoryKey = "frontline:memory";

async function ensureJsonFile(filePath: string, fallback: string) {
  await fs.mkdir(writableDataDir, { recursive: true });
  try {
    await fs.access(filePath);
  } catch {
    const sourcePath = filePath.endsWith("cases.json") ? sourceCasesPath : sourceMemoryPath;
    const initial = await fs.readFile(sourcePath, "utf8").catch(() => fallback);
    await fs.writeFile(filePath, initial || fallback, "utf8");
  }
}

async function ensureStore() {
  await ensureJsonFile(casesPath, "[]");
  await ensureJsonFile(memoryPath, "[]");
}

function legacyStatus(status: string | undefined): CaseRecord["status"] {
  if (status === "active" || status === "waiting" || status === "ready") return "in_progress";
  if (status === "closed") return "closed";
  return (status as CaseRecord["status"]) ?? "new";
}

function migrateCase(raw: Record<string, unknown>): CaseRecord {
  const id = String(raw.id ?? uuid());
  const oldTranscript = Array.isArray(raw.transcript) ? raw.transcript : [];
  const oldAudit = Array.isArray(raw.auditLog) ? raw.auditLog : [];
  return {
    id,
    vertical: normalizeVertical((raw.vertical as "dental" | "government" | "compliance" | "city") ?? "dental"),
    status: legacyStatus(raw.status as string | undefined),
    contactName: (raw.contactName as string | undefined) ?? "Unknown contact",
    phone: (raw.phone as string | undefined) ?? (raw.contactPhone as string | undefined),
    email: raw.email as string | undefined,
    title: (raw.title as string | undefined) ?? "Frontline case",
    intent: (raw.intent as string | undefined) ?? "unknown",
    summary: (raw.summary as string | undefined) ?? "No summary yet.",
    nextAction: (raw.nextAction as string | undefined) ?? "Continue conversation",
    riskLevel: raw.riskLevel as CaseRecord["riskLevel"],
    extractedFields: (raw.extractedFields ?? raw.structured ?? {}) as Record<string, unknown>,
    missingFields: (raw.missingFields as string[] | undefined) ?? [],
    messages:
      (raw.messages as Message[] | undefined) ??
      oldTranscript.map((item) =>
        message(
          id,
          item.role === "agent" ? "assistant" : item.role === "contact" ? "user" : "system",
          item.body ?? "",
          "sms",
          undefined,
          item.at
        )
      ),
    auditLogs:
      (raw.auditLogs as AuditLog[] | undefined) ??
      oldAudit.map((item) => audit(id, item.action ?? "legacy.audit", item.detail ?? {}, item.at)),
    retrievalSnippets: (raw.retrievalSnippets as RetrievalSnippet[] | undefined) ?? [],
    memoryResults: (raw.memoryResults as MemoryResult[] | undefined) ?? [],
    sentEmails: (raw.sentEmails as SentEmail[] | undefined) ?? [],
    processedProviderMessageIds: (raw.processedProviderMessageIds as string[] | undefined) ?? [],
    providerConversationIds: (raw.providerConversationIds as string[] | undefined) ?? [],
    createdAt: (raw.createdAt as string | undefined) ?? new Date().toISOString(),
    updatedAt: (raw.updatedAt as string | undefined) ?? new Date().toISOString()
  };
}

export async function readCases(): Promise<CaseRecord[]> {
  if (hasUpstash()) {
    const cases = await redisGet<Record<string, unknown>[]>(casesKey, []);
    return cases.map(migrateCase);
  }
  await ensureStore();
  const raw = await fs.readFile(casesPath, "utf8");
  const parsed = JSON.parse(raw) as Record<string, unknown>[];
  return parsed.map(migrateCase);
}

async function writeCases(cases: CaseRecord[]) {
  if (hasUpstash()) {
    await redisSetJson(casesKey, cases);
    return;
  }
  await ensureStore();
  await fs.writeFile(casesPath, JSON.stringify(cases, null, 2), "utf8");
}

export function audit(
  caseId: string,
  eventType: string,
  details: Record<string, unknown>,
  createdAt = new Date().toISOString()
): AuditLog {
  return {
    id: uuid(),
    caseId,
    eventType,
    details,
    createdAt
  };
}

export function message(
  caseId: string,
  role: Message["role"],
  content: string,
  channel: Message["channel"] = "sms",
  providerMessageId?: string,
  createdAt = new Date().toISOString()
): Message {
  return {
    id: uuid(),
    caseId,
    role,
    channel,
    content,
    providerMessageId,
    createdAt
  };
}

export async function createCase(scenario: DemoScenario): Promise<CaseRecord> {
  const now = new Date().toISOString();
  const record: CaseRecord = {
    id: uuid(),
    vertical: scenario.vertical,
    status: "new",
    contactName: scenario.contactName,
    phone: scenario.phone,
    email: scenario.email,
    title: scenario.title,
    intent: "demo_started",
    extractedFields: scenario.seedExtractedFields,
    missingFields: [],
    summary: "Demo conversation started. Waiting for user response.",
    nextAction: "Await inbound message",
    messages: [],
    auditLogs: [],
    retrievalSnippets: [],
    memoryResults: [],
    sentEmails: [],
    processedProviderMessageIds: [],
    providerConversationIds: [],
    createdAt: now,
    updatedAt: now
  };
  record.messages.push(message(record.id, "assistant", scenario.firstMessage, "sms"));
  record.auditLogs.push(audit(record.id, "case.created", { vertical: scenario.vertical, title: scenario.title }));
  record.auditLogs.push(audit(record.id, "agentphone.outbound.mocked", { to: scenario.phone, body: scenario.firstMessage }));

  const cases = await readCases();
  cases.unshift(record);
  await writeCases(cases);
  return record;
}

export async function getCase(id: string): Promise<CaseRecord | undefined> {
  const cases = await readCases();
  return cases.find((item) => item.id === id);
}

export async function updateCase(id: string, updater: (record: CaseRecord) => CaseRecord): Promise<CaseRecord | undefined> {
  const cases = await readCases();
  const index = cases.findIndex((item) => item.id === id);
  if (index === -1) return undefined;
  const updated = updater(cases[index]);
  updated.updatedAt = new Date().toISOString();
  cases[index] = updated;
  await writeCases(cases);
  return updated;
}

export async function addLocalMemory(memory: Omit<MemoryResult, "id" | "createdAt" | "source"> & { userId: string }) {
  const memories = await readMemoryRecords();
  const record = {
    id: uuid(),
    source: "local" as const,
    content: memory.content,
    metadata: memory.metadata,
    score: memory.score,
    userId: memory.userId,
    createdAt: new Date().toISOString()
  };
  memories.unshift(record);
  await writeMemoryRecords(memories);
  return record;
}

export async function searchLocalMemory(userId: string, query: string): Promise<MemoryResult[]> {
  const memories = await readMemoryRecords();
  const terms = query.toLowerCase().split(/\W+/).filter(Boolean);
  return memories
    .filter((item) => item.userId === userId || item.metadata?.caseId === userId)
    .map((item) => ({
      ...item,
      score: terms.reduce((score, term) => score + (item.content.toLowerCase().includes(term) ? 1 : 0), 0)
    }))
    .filter((item) => (item.score ?? 0) > 0 || !query.trim())
    .slice(0, 5);
}

async function readMemoryRecords() {
  if (hasUpstash()) return redisGet<Array<MemoryResult & { userId: string }>>(memoryKey, []);
  await ensureStore();
  const raw = await fs.readFile(memoryPath, "utf8");
  return JSON.parse(raw) as Array<MemoryResult & { userId: string }>;
}

async function writeMemoryRecords(memories: Array<MemoryResult & { userId: string }>) {
  if (hasUpstash()) {
    await redisSetJson(memoryKey, memories);
    return;
  }
  await ensureStore();
  await fs.writeFile(memoryPath, JSON.stringify(memories, null, 2), "utf8");
}
