"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Building2, CalendarCheck, ShieldAlert } from "lucide-react";
import { DemoScenarioCard } from "@/components/ui-shell";
import type { Vertical } from "@/lib/types";

const options = [
  {
    vertical: "dental" as Vertical,
    title: "Dental Demo",
    description: "BrightSmile recall agent answers insurance questions, proposes appointment slots, and asks for email.",
    icon: CalendarCheck,
    gradient: "from-cyan-500/25 via-blue-500/10 to-transparent",
    flow: ["Outbound SMS recall", "Moss insurance FAQ", "Mock appointment slots", "AgentMail summary"]
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

  async function startDemo(vertical: Vertical) {
    setLoading(vertical);
    const response = await fetch("/api/start-demo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vertical })
    });
    const data = await response.json();
    setLoading(null);
    if (data.case?.id) {
      router.push(`/cases/${data.case.id}`);
      router.refresh();
    }
  }

  async function startCallDemo(vertical: Vertical) {
    setCalling(vertical);
    const response = await fetch("/api/start-demo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vertical })
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
                  onClick: () => startCallDemo(option.vertical)
                }
              : undefined
          }
          secondaryLoading={calling === option.vertical}
        />
      ))}
    </div>
  );
}
