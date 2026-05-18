import { NextResponse } from "next/server";
import { audit, message, updateCase } from "@/lib/store";
import type { CaseStatus } from "@/lib/types";

type PatchBody = {
  email?: string;
  contactName?: string;
  phone?: string;
  status?: CaseStatus;
  summary?: string;
  nextAction?: string;
  extractedFields?: Record<string, unknown>;
  auditEvent?: string;
  auditDetails?: Record<string, unknown>;
  systemMessage?: string;
};

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as PatchBody;

  const record = await updateCase(id, (current) => ({
    ...current,
    email: body.email?.trim() || current.email,
    contactName: body.contactName?.trim() || current.contactName,
    phone: body.phone?.trim() || current.phone,
    status: body.status ?? current.status,
    summary: body.summary ?? current.summary,
    nextAction: body.nextAction ?? current.nextAction,
    extractedFields: {
      ...current.extractedFields,
      ...(body.extractedFields ?? {})
    },
    messages: body.systemMessage ? [message(current.id, "system", body.systemMessage, "chat"), ...current.messages] : current.messages,
    auditLogs: [
      audit(current.id, body.auditEvent ?? "case.patch.updated", body.auditDetails ?? { patch: body }),
      ...current.auditLogs
    ]
  }));

  if (!record) return NextResponse.json({ error: "Case not found" }, { status: 404 });
  return NextResponse.json({ ok: true, case: record });
}
