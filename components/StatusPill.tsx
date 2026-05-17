import { CalendarCheck, ShieldAlert, Workflow } from "lucide-react";
import { StatusBadge } from "@/components/ui-shell";
import type { CaseStatus, Vertical } from "@/lib/types";

export function StatusPill({ status }: { status: CaseStatus }) {
  return <StatusBadge status={status} />;
}

export function VerticalPill({ vertical }: { vertical: Vertical }) {
  const config = {
    dental: { label: "Dental Recall", icon: CalendarCheck, className: "bg-cyan-400/12 text-cyan-100 border-cyan-300/25" },
    government: { label: "City Services", icon: Workflow, className: "bg-violet-400/12 text-violet-100 border-violet-300/25" },
    compliance: { label: "Compliance Review", icon: ShieldAlert, className: "bg-amber-400/12 text-amber-100 border-amber-300/25" }
  }[vertical];
  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${config.className}`}>
      <Icon className="h-3.5 w-3.5" />
      {config.label}
    </span>
  );
}
