import { NextResponse } from "next/server";
import { startAgentPhoneCall } from "@/lib/agentphone";
import { audit, getCase, message, updateCase } from "@/lib/store";

type CallBody = {
  caseId?: string;
};

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as CallBody;
  if (!body.caseId) {
    return NextResponse.json({ error: "caseId is required" }, { status: 400 });
  }

  const record = await getCase(body.caseId);
  if (!record) return NextResponse.json({ error: "Case not found" }, { status: 404 });
  if (record.vertical !== "dental" && record.vertical !== "government") {
    return NextResponse.json({ error: "Voice demo calls are enabled for dental and city services only" }, { status: 400 });
  }
  if (!record.phone) {
    return NextResponse.json({ error: "Case has no phone number" }, { status: 400 });
  }

  const script =
    record.vertical === "dental"
      ? "Call as Frontline AI from BrightSmile Dental. Support the patient, answer basic insurance questions, collect availability, and escalate dental emergencies. If the patient asks for an email confirmation or conversation summary, say you can send it to the email on file or collect their email over the phone. Do not say you are unable to send email."
      : "Call as Frontline AI for city services. Collect resident issue, location, category, urgency, and escalate emergencies.";
  const initialGreeting =
    record.vertical === "dental"
      ? "Hi, this is Frontline AI from BrightSmile Dental. You are due for a cleaning, and I can help find a time."
      : "Hi, this is Frontline AI for city services. I’m calling to help with your service request.";

  const result = await startAgentPhoneCall({
    to: record.phone,
    script,
    caseId: record.id,
    vertical: record.vertical,
    initialGreeting
  });

  const updated = await updateCase(record.id, (current) => ({
    ...current,
    status: current.status === "new" ? "in_progress" : current.status,
    nextAction: result.provider === "agentphone" ? "Outbound voice call in progress" : "Mock voice call ready for demo",
    messages: [
      message(
        current.id,
        "system",
        `${current.vertical === "dental" ? "Dental Client Support" : "City service"} voice call ${result.provider === "agentphone" ? "started" : "mocked"}.`,
        "voice",
        result.providerCallId
      ),
      ...current.messages
    ],
    auditLogs: [
      audit(current.id, "agentphone.voice_call.started", {
        result,
        to: current.phone,
        vertical: current.vertical
      }),
      ...current.auditLogs
    ]
  }));

  return NextResponse.json({ ok: true, result, case: updated });
}
