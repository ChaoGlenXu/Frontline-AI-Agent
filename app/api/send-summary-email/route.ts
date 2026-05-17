import { NextResponse } from "next/server";
import { sendCaseSummaryEmail } from "@/lib/agentmail";

type EmailBody = {
  caseId?: string;
  recipientEmail?: string;
};

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as EmailBody;
  if (!body.caseId || !body.recipientEmail) {
    return NextResponse.json({ error: "caseId and recipientEmail are required" }, { status: 400 });
  }

  try {
    const email = await sendCaseSummaryEmail(body.caseId, body.recipientEmail);
    return NextResponse.json({ ok: true, email });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to send email" }, { status: 404 });
  }
}
