"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Mail, Send } from "lucide-react";
import { readStoredUserProfile } from "@/components/UserProfileCard";

type Props = {
  caseId: string;
  email?: string;
  vertical?: string;
  phone?: string;
};

const actions = [
  { action: "escalate", label: "Escalate to Human" },
  { action: "mark_booked", label: "Mark Booked" },
  { action: "mark_ticket_created", label: "Mark Ticket Created" },
  { action: "mark_compliance_completed", label: "Mark Compliance Review Completed" }
];

export function CaseActions({ caseId, email, vertical, phone }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [recipientEmail, setRecipientEmail] = useState(email ?? "");
  const [savedEmail, setSavedEmail] = useState("");

  useEffect(() => {
    function syncProfileEmail() {
      setSavedEmail(readStoredUserProfile().email);
    }

    syncProfileEmail();
    window.addEventListener("frontline-profile-updated", syncProfileEmail);
    window.addEventListener("storage", syncProfileEmail);
    return () => {
      window.removeEventListener("frontline-profile-updated", syncProfileEmail);
      window.removeEventListener("storage", syncProfileEmail);
    };
  }, []);

  async function handoff(action: string) {
    setBusy(action);
    await fetch(`/api/cases/${caseId}/handoff`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, reason: "Dashboard button clicked" })
    });
    setBusy(null);
    router.refresh();
  }

  async function sendEmail(targetEmail = recipientEmail, busyKey = "email") {
    const cleanEmail = targetEmail.trim();
    if (!cleanEmail) return;
    setBusy(busyKey);
    await fetch("/api/send-summary-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ caseId, recipientEmail: cleanEmail })
    });
    setBusy(null);
    setRecipientEmail(cleanEmail);
    router.refresh();
  }

  async function startCall() {
    setBusy("call");
    await fetch("/api/agentphone/call", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ caseId })
    });
    setBusy(null);
    router.refresh();
  }

  const canCall = Boolean(phone && (vertical === "dental" || vertical === "government"));

  return (
    <section className="glass-card rounded-3xl p-5">
      <h2 className="mb-4 text-xl font-semibold text-white">Case Actions</h2>
      {canCall && (
        <button
          type="button"
          onClick={startCall}
          className="mb-3 w-full rounded-2xl border border-cyan-300/30 bg-cyan-400/12 px-4 py-3 text-left text-sm font-bold text-cyan-50 transition hover:border-cyan-200/60 hover:bg-cyan-400/18 disabled:opacity-60"
          disabled={busy === "call"}
        >
          {busy === "call" ? "Starting voice call..." : vertical === "dental" ? "Start Dental Voice Call" : "Start City Service Voice Call"}
        </button>
      )}
      <div className="flex gap-2">
        <input
          value={recipientEmail}
          onChange={(event) => setRecipientEmail(event.target.value)}
          className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-white outline-none ring-cyan-400/40 placeholder:text-slate-500 focus:ring-2"
          placeholder="summary@example.com"
        />
        <button
          type="button"
          onClick={() => sendEmail()}
          className="rounded-2xl bg-white px-4 py-3 text-sm font-bold text-slate-950 transition hover:bg-cyan-100 disabled:opacity-60"
          disabled={busy === "email" || !recipientEmail.trim()}
        >
          Email
        </button>
      </div>
      <button
        type="button"
        onClick={() => sendEmail(savedEmail || email || recipientEmail, "self-email")}
        className="mt-3 flex w-full items-center justify-between gap-3 rounded-2xl border border-purple-300/25 bg-purple-400/10 px-4 py-3 text-left text-sm font-bold text-purple-50 transition hover:border-purple-200/50 hover:bg-purple-400/15 disabled:cursor-not-allowed disabled:opacity-50"
        disabled={busy === "self-email" || !(savedEmail || email || recipientEmail).trim()}
      >
        <span className="inline-flex items-center gap-2">
          <Mail className="h-4 w-4" />
          {busy === "self-email" ? "Sending to saved email..." : "Send summary to myself"}
        </span>
        <span className="inline-flex min-w-0 items-center gap-2 text-xs font-semibold text-purple-100/80">
          <span className="truncate">{savedEmail || email || "No saved email"}</span>
          <Send className="h-3.5 w-3.5 shrink-0" />
        </span>
      </button>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {actions.map((item) => (
          <button
            key={item.action}
            type="button"
            onClick={() => handoff(item.action)}
            className="rounded-2xl border border-white/10 bg-white/[0.045] px-4 py-3 text-left text-sm font-semibold text-slate-200 transition hover:border-cyan-300/40 hover:bg-white/[0.08] disabled:opacity-60"
            disabled={busy === item.action}
          >
            {busy === item.action ? "Updating..." : item.label}
          </button>
        ))}
      </div>
    </section>
  );
}
