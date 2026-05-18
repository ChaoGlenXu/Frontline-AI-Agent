import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  Activity,
  ArrowUpRight,
  Bot,
  CalendarCheck,
  CheckCircle2,
  CircleDot,
  Clock3,
  Mail,
  MessageSquareText,
  Phone,
  Search,
  ShieldAlert,
  Sparkles,
  Users,
  Workflow,
  XCircle
} from "lucide-react";
import type { AuditLog, CaseRecord, CaseStatus, Message, SponsorStatus, Vertical } from "@/lib/types";

const statusStyles: Record<CaseStatus, string> = {
  new: "border-slate-400/25 bg-slate-400/10 text-slate-100",
  in_progress: "border-cyan-400/30 bg-cyan-400/12 text-cyan-100",
  booked: "border-emerald-400/30 bg-emerald-400/12 text-emerald-100",
  ticket_created: "border-teal-400/30 bg-teal-400/12 text-teal-100",
  escalated: "border-rose-400/35 bg-rose-500/14 text-rose-100",
  emailed: "border-violet-400/30 bg-violet-400/12 text-violet-100",
  closed: "border-slate-500/25 bg-slate-500/12 text-slate-200"
};

const verticalStyles: Record<Vertical, { label: string; icon: LucideIcon; accent: string; gradient: string }> = {
  dental: {
    label: "Dental Client Support",
    icon: CalendarCheck,
    accent: "text-cyan-200",
    gradient: "from-cyan-500/20 via-blue-500/10 to-transparent"
  },
  government: {
    label: "City Services",
    icon: Workflow,
    accent: "text-violet-200",
    gradient: "from-violet-500/20 via-fuchsia-500/10 to-transparent"
  },
  compliance: {
    label: "Compliance Review",
    icon: ShieldAlert,
    accent: "text-amber-200",
    gradient: "from-amber-500/20 via-rose-500/10 to-transparent"
  }
};

export function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative mx-auto min-h-screen max-w-7xl px-4 py-6 text-slate-50 sm:px-6 lg:px-8">
      <div className="pointer-events-none fixed inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/70 to-transparent" />
      {children}
    </main>
  );
}

export function PageHeader({
  eyebrow,
  title,
  subtitle,
  action
}: {
  eyebrow?: string;
  title: string;
  subtitle: string;
  action?: React.ReactNode;
}) {
  return (
    <header className="relative overflow-hidden rounded-3xl border border-white/10 bg-slate-950/70 p-6 shadow-2xl shadow-cyan-950/20 backdrop-blur md:p-8">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(34,211,238,0.18),transparent_28rem),radial-gradient(circle_at_80%_10%,rgba(168,85,247,0.2),transparent_24rem)]" />
      <div className="relative flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          {eyebrow && (
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-cyan-100">
              <Sparkles className="h-3.5 w-3.5" />
              {eyebrow}
            </div>
          )}
          <h1 className="max-w-4xl text-4xl font-semibold tracking-tight text-white md:text-6xl">{title}</h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300 md:text-lg">{subtitle}</p>
        </div>
        {action && <div className="relative shrink-0">{action}</div>}
      </div>
    </header>
  );
}

export function StatCard({ label, value, icon: Icon, tone = "cyan" }: { label: string; value: string | number; icon: LucideIcon; tone?: "cyan" | "violet" | "emerald" | "amber" | "rose" }) {
  const tones = {
    cyan: "from-cyan-400/20 text-cyan-200 ring-cyan-300/20",
    violet: "from-violet-400/20 text-violet-200 ring-violet-300/20",
    emerald: "from-emerald-400/20 text-emerald-200 ring-emerald-300/20",
    amber: "from-amber-400/20 text-amber-200 ring-amber-300/20",
    rose: "from-rose-400/20 text-rose-200 ring-rose-300/20"
  };
  return (
    <div className="glass-card rounded-2xl p-5 transition duration-200 hover:-translate-y-0.5 hover:border-white/20 hover:shadow-cyan-950/30">
      <div className="flex items-center justify-between">
        <div className={`rounded-2xl bg-gradient-to-br ${tones[tone]} to-white/5 p-3 ring-1`}>
          <Icon className="h-5 w-5" />
        </div>
        <ArrowUpRight className="h-4 w-4 text-slate-500" />
      </div>
      <div className="mt-5 text-3xl font-semibold tracking-tight text-white">{value}</div>
      <div className="mt-1 text-sm text-slate-400">{label}</div>
    </div>
  );
}

export function StatusBadge({ status }: { status: CaseStatus }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold capitalize ${statusStyles[status]}`}>
      <CircleDot className="h-3 w-3" />
      {status.replaceAll("_", " ")}
    </span>
  );
}

export function IntegrationBadge({ status }: { status: SponsorStatus }) {
  const iconMap: Record<SponsorStatus["name"], LucideIcon> = {
    AgentPhone: Phone,
    AgentMail: Mail,
    Moss: Search,
    Supermemory: Bot,
    OpenAI: Sparkles,
    Gemini: Sparkles
  };
  const Icon = iconMap[status.name];
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 transition hover:border-cyan-300/30 hover:bg-white/[0.07]">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-white">
          <Icon className="h-4 w-4 text-cyan-200" />
          {status.name}
        </div>
        <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide ${status.configured ? "bg-emerald-400/15 text-emerald-200" : "bg-amber-400/15 text-amber-200"}`}>
          {status.lastStatus}
        </span>
      </div>
      <p className="mt-3 text-xs leading-5 text-slate-400">{status.detail}</p>
    </div>
  );
}

export function WorkflowCard({ vertical, count, description, href = "/demo" }: { vertical: Vertical; count: number; description: string; href?: string }) {
  const style = verticalStyles[vertical];
  const Icon = style.icon;
  return (
    <Link href={href} className="group relative overflow-hidden rounded-2xl border border-white/10 bg-slate-950/55 p-5 shadow-xl shadow-black/20 transition duration-200 hover:-translate-y-1 hover:border-cyan-300/30">
      <div className={`absolute inset-0 bg-gradient-to-br ${style.gradient} opacity-80`} />
      <div className="relative">
        <div className="flex items-center justify-between">
          <div className="rounded-2xl border border-white/10 bg-white/10 p-3">
            <Icon className={`h-5 w-5 ${style.accent}`} />
          </div>
          <span className="rounded-full bg-white/10 px-2.5 py-1 text-xs font-semibold text-slate-200">{count} cases</span>
        </div>
        <h3 className="mt-5 text-xl font-semibold text-white">{style.label}</h3>
        <p className="mt-2 text-sm leading-6 text-slate-300">{description}</p>
      </div>
    </Link>
  );
}

export function CaseCard({ record }: { record: CaseRecord }) {
  const style = verticalStyles[record.vertical];
  const Icon = style.icon;
  return (
    <Link href={`/cases/${record.id}`} className="group block rounded-2xl border border-white/10 bg-white/[0.045] p-5 transition duration-200 hover:-translate-y-0.5 hover:border-cyan-300/30 hover:bg-white/[0.07]">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-2.5 py-1 text-xs font-semibold text-slate-200">
              <Icon className={`h-3.5 w-3.5 ${style.accent}`} />
              {style.label}
            </span>
            <StatusBadge status={record.status} />
          </div>
          <h3 className="mt-4 text-lg font-semibold text-white group-hover:text-cyan-100">{record.title}</h3>
          <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-400">{record.summary}</p>
        </div>
        <div className="shrink-0 rounded-2xl border border-white/10 bg-slate-950/45 px-4 py-3 md:w-64">
          <div className="text-sm font-semibold text-white">{record.contactName ?? "Unknown contact"}</div>
          <div className="mt-1 text-xs text-slate-400">{record.phone ?? "No phone"}</div>
          <div className="mt-3 text-xs font-medium text-cyan-200">{record.nextAction}</div>
        </div>
      </div>
    </Link>
  );
}

export function TranscriptBubble({ item }: { item: Message }) {
  const isAssistant = item.role === "assistant";
  return (
    <div className={`flex ${isAssistant ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[88%] rounded-2xl border px-4 py-3 text-sm shadow-lg ${isAssistant ? "border-cyan-300/20 bg-cyan-400/12 text-cyan-50" : "border-white/10 bg-white/[0.07] text-slate-100"}`}>
        <div className="mb-1 flex items-center gap-2 text-[11px] uppercase tracking-wide text-slate-400">
          {isAssistant ? <Bot className="h-3 w-3" /> : <Users className="h-3 w-3" />}
          {item.role} · {item.channel} · {new Date(item.createdAt).toLocaleTimeString()}
        </div>
        <div className="leading-6">{item.content}</div>
      </div>
    </div>
  );
}

export function AuditLogItem({ event }: { event: AuditLog }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-sm font-semibold text-white">{event.eventType}</div>
          <div className="mt-1 text-xs text-slate-500">{new Date(event.createdAt).toLocaleString()}</div>
        </div>
        <Activity className="h-4 w-4 text-cyan-200" />
      </div>
      <pre className="mt-3 max-h-28 overflow-auto whitespace-pre-wrap break-words rounded-xl bg-black/25 p-3 text-xs leading-5 text-slate-300">
        {JSON.stringify(event.details, null, 2)}
      </pre>
    </div>
  );
}

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
  icon: LucideIcon;
  gradient: string;
  onStart: () => void;
  loading: boolean;
  secondaryAction?: { label: string; onClick: () => void };
  secondaryLoading?: boolean;
}) {
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
          <button
            type="button"
            onClick={secondaryAction.onClick}
            className="mt-3 w-full rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm font-bold text-white transition hover:border-cyan-300/50 hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-70"
            disabled={secondaryLoading}
          >
            {secondaryLoading ? "Starting call..." : secondaryAction.label}
          </button>
        )}
      </div>
    </div>
  );
}

export const metricIcons = { Phone, MessageSquareText, Mail, Users, Clock3, XCircle };
