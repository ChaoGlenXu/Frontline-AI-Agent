"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Building2, CalendarCheck, CheckCircle2, ShieldAlert } from "lucide-react";
import { readStoredUserProfile, type StoredUserProfile } from "@/components/UserProfileCard";
import type { Vertical } from "@/lib/types";

export function DemoScenarioCard({
  title,
  description,
  flow,
  icon: Icon,
  gradient,
  onStart,
  loading,
  secondaryAction,
  secondaryLoading
}: {
  title: string;
  description: string;
  flow: string[];
  icon: React.ComponentType<{ className?: string }>;
  gradient: string;
  onStart: () => void;
  loading: boolean;
  secondaryAction?: { label: string; onCall: (phoneNumber: string) => void };
  secondaryLoading?: boolean;
}) {
  const [phone, setPhone] = useState("");
  const [storedPhone, setStoredPhone] = useState("");

  useEffect(() => {
    const loadProfile = () => setStoredPhone(readStoredUserProfile().phone);
    loadProfile();
    window.addEventListener("frontline-profile-updated", loadProfile);
    return () => window.removeEventListener("frontline-profile-updated", loadProfile);
  }, []);

  return (
    <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-slate-950/60 p-6 shadow-2xl shadow-black/20">
      <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-70`} />
      <div className="relative">
        <div className="flex items-center justify-between">
          <div className="rounded-2xl border border-white/10 bg-white/10 p-3">
            <Icon className="h-6 w-6 text-white" />
          </div>
          <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-slate-200">Live flow</span>
        </div>
        <h3 className="mt-6 text-2xl font-semibold text-white">{title}</h3>
        <p className="mt-2 text-sm leading-6 text-slate-300">{description}</p>
        <div className="mt-5 space-y-2">
          {flow.map((item) => (
            <div key={item} className="flex items-center gap-2 text-sm text-slate-300">
              <CheckCircle2 className="h-4 w-4 text-emerald-300" />
              {item}
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={onStart}
          className="mt-6 w-full rounded-2xl bg-white px-4 py-3 text-sm font-bold text-slate-950 transition hover:scale-[1.01] hover:bg-cyan-100 disabled:cursor-not-allowed disabled:opacity-70"
          disabled={loading}
        >
          {loading ? "Starting..." : `Start ${title}`}
        </button>
        {secondaryAction && (
          <div className="mt-3 flex flex-col gap-2">
            <input
              type="tel"
              placeholder={storedPhone || "+1234567890"}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white placeholder-slate-400 outline-none focus:border-cyan-300/50"
            />
            <button
              type="button"
              onClick={() => secondaryAction.onCall(phone || storedPhone)}
              className="w-full rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm font-bold text-white transition hover:border-cyan-300/50 hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-70"
              disabled={secondaryLoading || !(phone || storedPhone)}
            >
              {secondaryLoading ? "Starting call..." : secondaryAction.label}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

const options = [
  {
    vertical: "dental" as Vertical,
    title: "Dental Client Support Demo",
    description: "BrightSmile support agent answers insurance questions, proposes appointment slots, and asks for email.",
    icon: CalendarCheck,
    gradient: "from-cyan-500/25 via-blue-500/10 to-transparent",
    flow: ["Outbound SMS support", "Moss insurance FAQ", "Mock appointment slots", "AgentMail summary"]
  },
  {
    vertical: "government" as Vertical,
    title: "Government Demo",
    description: "City service worker captures a resident report and converts it into ticket-ready structured data.",
    icon: Building2,
    gradient: "from-violet-500/25 via-fuchsia-500/10 to-transparent",
    flow: ["Resident issue intake", "Location extraction", "Urgency routing", "Ticket created"]
  },
  {
    vertical: "compliance" as Vertical,
    title: "Compliance Demo",
    description: "AML agent collects suspicious transaction context, classifies risk, and escalates for review.",
    icon: ShieldAlert,
    gradient: "from-amber-500/25 via-rose-500/10 to-transparent",
    flow: ["KYC detail capture", "Risk signal summary", "Audit packet", "Human handoff"]
  }
];

export function DemoControls() {
  const router = useRouter();
  const [loading, setLoading] = useState<Vertical | null>(null);
  const [calling, setCalling] = useState<Vertical | null>(null);
  const [profile, setProfile] = useState<StoredUserProfile>({ name: "", phone: "", email: "" });

  useEffect(() => {
    const loadProfile = () => setProfile(readStoredUserProfile());
    loadProfile();
    window.addEventListener("frontline-profile-updated", loadProfile);
    return () => window.removeEventListener("frontline-profile-updated", loadProfile);
  }, []);

  function profilePayload(overrides: Partial<StoredUserProfile> = {}) {
    const merged = { ...profile, ...overrides };
    return {
      contactName: merged.name || undefined,
      phone: merged.phone || undefined,
      email: merged.email || undefined
    };
  }

  async function startDemo(vertical: Vertical) {
    setLoading(vertical);
    const response = await fetch("/api/start-demo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vertical, ...profilePayload() })
    });
    const data = await response.json();
    setLoading(null);
    if (data.case?.id) {
      router.push(`/cases/${data.case.id}`);
      router.refresh();
    }
  }

  async function startCallDemo(vertical: Vertical, phoneNumber: string) {
    const phone = phoneNumber || profile.phone;
    if (!phone) return;
    setCalling(vertical);
    const response = await fetch("/api/start-demo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vertical, ...profilePayload({ phone }) })
    });
    const data = await response.json();
    if (data.case?.id) {
      await fetch("/api/agentphone/call", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caseId: data.case.id })
      });
      router.push(`/cases/${data.case.id}`);
      router.refresh();
    }
    setCalling(null);
  }

  return (
    <div className="grid gap-5 lg:grid-cols-3">
      {options.map((option) => (
        <DemoScenarioCard
          key={option.vertical}
          title={option.title}
          description={option.description}
          icon={option.icon}
          gradient={option.gradient}
          flow={option.flow}
          loading={loading === option.vertical}
          onStart={() => startDemo(option.vertical)}
          secondaryAction={
            option.vertical === "dental" || option.vertical === "government"
              ? {
                  label: option.vertical === "dental" ? "Start Dental Voice Call" : "Start City Voice Call",
                  onCall: (phone) => startCallDemo(option.vertical, phone)
                }
              : undefined
          }
          secondaryLoading={calling === option.vertical}
        />
      ))}
    </div>
  );
}
