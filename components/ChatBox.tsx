"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";
import { Bot, Loader2, Send, User } from "lucide-react";

const quickScenarios = [
  "Do you take Delta Dental? Friday afternoon works.",
  "There’s a pothole near 5th and Mission.",
  "Customer received $9,800 from unknown sender."
];

export function ChatBox() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [caseId, setCaseId] = useState(searchParams.get("caseId") ?? "");
  const [message, setMessage] = useState(quickScenarios[1]);
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([
    {
      role: "assistant",
      content: "Paste a case ID, choose a quick scenario, and I’ll run the same orchestration used by SMS and voice."
    }
  ]);
  const [busy, setBusy] = useState(false);

  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!caseId.trim() || !message.trim()) return;
    const outgoing = message;
    setMessages((items) => [...items, { role: "user", content: outgoing }]);
    setMessage("");
    setBusy(true);
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ caseId, message: outgoing })
    });
    const data = await response.json();
    setMessages((items) => [...items, { role: "assistant", content: data.reply ?? data.error ?? "No reply" }]);
    setBusy(false);
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-3xl rounded-[2rem] border border-white/10 bg-slate-950/70 p-4 shadow-2xl shadow-cyan-950/20 backdrop-blur">
      <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.045] p-4">
        <label className="text-xs font-bold uppercase tracking-[0.22em] text-slate-500">
          Case ID
          <input
            value={caseId}
            onChange={(event) => setCaseId(event.target.value)}
            className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm font-normal tracking-normal text-white outline-none ring-cyan-400/40 placeholder:text-slate-600 focus:ring-2"
            placeholder="Paste a case ID or open chat from case detail"
          />
        </label>
      </div>

      <div className="mt-4 h-[460px] space-y-4 overflow-auto rounded-[1.5rem] border border-white/10 bg-black/20 p-4">
        {messages.map((item, index) => (
          <div key={`${item.role}-${index}`} className={`flex ${item.role === "assistant" ? "justify-start" : "justify-end"}`}>
            <div className={`max-w-[86%] rounded-2xl border px-4 py-3 text-sm leading-6 ${item.role === "assistant" ? "border-cyan-300/20 bg-cyan-400/10 text-cyan-50" : "border-violet-300/20 bg-violet-400/12 text-violet-50"}`}>
              <div className="mb-1 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                {item.role === "assistant" ? <Bot className="h-3 w-3" /> : <User className="h-3 w-3" />}
                {item.role}
              </div>
              {item.content}
            </div>
          </div>
        ))}
        {busy && (
          <div className="flex justify-start">
            <div className="flex items-center gap-2 rounded-2xl border border-cyan-300/20 bg-cyan-400/10 px-4 py-3 text-sm text-cyan-50">
              <Loader2 className="h-4 w-4 animate-spin" />
              Frontline is thinking
            </div>
          </div>
        )}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {quickScenarios.map((scenario) => (
          <button
            key={scenario}
            type="button"
            onClick={() => setMessage(scenario)}
            className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5 text-xs font-semibold text-slate-300 transition hover:border-cyan-300/40 hover:text-white"
          >
            {scenario}
          </button>
        ))}
      </div>

      <form onSubmit={send} className="mt-4 flex gap-3">
        <textarea
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          className="min-h-14 flex-1 rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none ring-cyan-400/40 placeholder:text-slate-600 focus:ring-2"
          placeholder="Message the agent..."
        />
        <button
          type="submit"
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white text-slate-950 transition hover:scale-[1.03] hover:bg-cyan-100 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={busy || !caseId.trim() || !message.trim()}
          aria-label="Send chat message"
        >
          <Send className="h-5 w-5" />
        </button>
      </form>
    </div>
  );
}
