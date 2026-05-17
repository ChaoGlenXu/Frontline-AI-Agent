"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

type Props = {
  caseId: string;
  phone?: string;
  vertical: string;
};

const sampleReplies: Record<string, string[]> = {
  dental: [
    "Yes, a cleaning would be good. Tuesday afternoon works if you have anything.",
    "Please book it, and I still have Delta Dental.",
    "Can you do Friday morning instead?"
  ],
  government: [
    "There is a pothole near 5th and Mission.",
    "The exact location is 8th and Market, eastbound lane.",
    "Yes, it is urgent because cars are swerving around it."
  ],
  compliance: [
    "A customer received $9,800 from an unknown sender and then attempted a large cash withdrawal.",
    "We have the vendor contract, invoice, and beneficial owner details on file.",
    "There was a new beneficiary and rushed settlement request, so medium risk seems appropriate."
  ]
};

export function InboundSimulator({ caseId, phone, vertical }: Props) {
  const router = useRouter();
  const [body, setBody] = useState(sampleReplies[vertical]?.[0] ?? "");
  const [sending, setSending] = useState(false);

  async function sendInbound(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!body.trim()) return;
    setSending(true);
    await fetch("/api/agentphone/inbound", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ caseId, from: phone, body })
    });
    setSending(false);
    setBody("");
    router.refresh();
  }

  return (
    <form onSubmit={sendInbound} className="glass-card rounded-3xl p-5">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-base font-semibold text-white">Inbound SMS Simulator</h2>
        <span className="rounded-full bg-cyan-300/10 px-3 py-1 text-xs font-bold text-cyan-100">AgentPhone mock</span>
      </div>
      <textarea
        value={body}
        onChange={(event) => setBody(event.target.value)}
        className="mt-4 min-h-28 w-full rounded-2xl border border-white/10 bg-black/25 p-4 text-sm text-white outline-none ring-cyan-400/40 placeholder:text-slate-500 focus:ring-2"
        placeholder="Type the contact's SMS reply"
      />
      <div className="mt-3 flex flex-wrap gap-2">
        {(sampleReplies[vertical] ?? []).map((sample) => (
          <button
            key={sample}
            type="button"
            onClick={() => setBody(sample)}
            className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-slate-300 transition hover:border-cyan-300/40 hover:text-white"
          >
            {sample.slice(0, 42)}
          </button>
        ))}
      </div>
      <button
        type="submit"
        className="mt-4 rounded-2xl bg-white px-4 py-3 text-sm font-bold text-slate-950 transition hover:bg-cyan-100 disabled:cursor-not-allowed disabled:opacity-60"
        disabled={sending || !body.trim()}
      >
        {sending ? "Sending..." : "Send inbound SMS"}
      </button>
    </form>
  );
}
