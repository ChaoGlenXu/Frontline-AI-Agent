import { NextResponse } from "next/server";
import { audit, updateCase } from "@/lib/store";
import { sendAgentPhoneSms } from "@/lib/agentphone";

type SendBody = {
  caseId?: string;
  to?: string;
  body?: string;
};

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as SendBody;

  if (!body.to || !body.body) {
    return NextResponse.json({ error: "to and body are required" }, { status: 400 });
  }

  const result = await sendAgentPhoneSms(body.to, body.body);

  if (body.caseId) {
    await updateCase(body.caseId, (record) => ({
      ...record,
      auditLogs: [
        audit(record.id, "agentphone.outbound.manual", { to: body.to, body: body.body, result }),
        ...record.auditLogs
      ]
    }));
  }

  return NextResponse.json({
    ok: true,
    provider: result.provider,
    mocked: result.provider === "mock",
    result,
    message: {
      to: body.to,
      body: body.body
    }
  });
}
