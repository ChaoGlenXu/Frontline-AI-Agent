import { NextResponse } from "next/server";
import { audit, updateCase } from "@/lib/store";
import type { CaseStatus } from "@/lib/types";

const statusByAction: Record<string, CaseStatus> = {
  escalate: "escalated",
  mark_booked: "booked",
  mark_ticket_created: "ticket_created",
  mark_compliance_completed: "closed",
  close: "closed"
};

const nextActionByAction: Record<string, string> = {
  escalate: "Human follow-up required",
  mark_booked: "Appointment booked",
  mark_ticket_created: "Service ticket created",
  mark_compliance_completed: "Compliance review completed",
  close: "Case closed"
};

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as { action?: string; reason?: string };
  const action = body.action ?? "escalate";
  const status = statusByAction[action];
  if (!status) {
    return NextResponse.json({ error: "Unknown handoff action" }, { status: 400 });
  }

  const record = await updateCase(id, (current) => ({
    ...current,
    status,
    nextAction: nextActionByAction[action],
    auditLogs: [
      audit(current.id, "case.handoff.updated", {
        action,
        reason: body.reason,
        status
      }),
      ...current.auditLogs
    ]
  }));

  if (!record) return NextResponse.json({ error: "Case not found" }, { status: 404 });
  return NextResponse.json({ ok: true, case: record });
}
