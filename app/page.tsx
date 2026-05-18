import Link from "next/link";
import { Bot, Mail, MessageSquareText, Phone, Users } from "lucide-react";
import { AIProviderToggle } from "@/components/AIProviderToggle";
import { UserProfileCard } from "@/components/UserProfileCard";
import { CaseCard, IntegrationBadge, PageHeader, PageShell, StatCard, WorkflowCard } from "@/components/ui-shell";
import { sponsorStatuses } from "@/lib/status";
import { readCases } from "@/lib/store";

export default async function DashboardPage() {
  const cases = await readCases();
  const activeCount = cases.filter((item) => item.status === "new" || item.status === "in_progress").length;
  const conversationsHandled = cases.reduce((sum, item) => sum + item.messages.length, 0);
  const emailsSent = cases.reduce((sum, item) => sum + item.sentEmails.length, 0);
  const humanHandoffs = cases.filter((item) => item.status === "escalated").length;
  const statuses = sponsorStatuses();

  const workflowCounts = {
    dental: cases.filter((item) => item.vertical === "dental").length,
    government: cases.filter((item) => item.vertical === "government").length,
    compliance: cases.filter((item) => item.vertical === "compliance").length
  };

  const pipeline = [
    { label: "New", value: cases.filter((item) => item.status === "new").length, color: "bg-slate-300" },
    { label: "In progress", value: cases.filter((item) => item.status === "in_progress").length, color: "bg-cyan-300" },
    { label: "Booked", value: cases.filter((item) => item.status === "booked").length, color: "bg-emerald-300" },
    { label: "Ticket", value: cases.filter((item) => item.status === "ticket_created").length, color: "bg-teal-300" },
    { label: "Escalated", value: humanHandoffs, color: "bg-rose-300" },
    { label: "Emailed", value: cases.filter((item) => item.status === "emailed").length, color: "bg-violet-300" }
  ];

  return (
    <PageShell>
      <div className="space-y-6">
        <PageHeader
          eyebrow="AI command center"
          title="Frontline AI Agent"
          subtitle="Phone/SMS AI workers for dental, government, and compliance workflows."
          action={
            <div className="flex flex-col gap-3">
              <AIProviderToggle />
              <div className="flex flex-wrap gap-3">
                <Link href="/demo" className="rounded-2xl bg-white px-4 py-3 text-sm font-bold text-slate-950 transition hover:scale-[1.02] hover:bg-cyan-100">
                  Start live demo
                </Link>
                <Link href="/chat" className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm font-bold text-white transition hover:border-cyan-300/50 hover:bg-white/15">
                  Open chatbox
                </Link>
              </div>
            </div>
          }
        />

        <section className="grid gap-4 md:grid-cols-4">
          <StatCard label="Active cases" value={activeCount} icon={Phone} tone="cyan" />
          <StatCard label="Conversations handled" value={conversationsHandled} icon={MessageSquareText} tone="violet" />
          <StatCard label="Emails sent" value={emailsSent} icon={Mail} tone="emerald" />
          <StatCard label="Human handoffs" value={humanHandoffs} icon={Users} tone="rose" />
        </section>

        <UserProfileCard />

        <section className="grid gap-4 lg:grid-cols-3">
          <WorkflowCard
            vertical="dental"
            count={workflowCounts.dental}
            description="Support dental clients, answer insurance questions, propose mock slots, and hand off emergencies."
          />
          <WorkflowCard
            vertical="government"
            count={workflowCounts.government}
            description="Capture resident issues, infer category and urgency, create ticket-ready city service summaries."
          />
          <WorkflowCard
            vertical="compliance"
            count={workflowCounts.compliance}
            description="Collect suspicious transaction context, classify risk, and create audit-ready review packets."
          />
        </section>

        <section className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="glass-card rounded-3xl p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-white">Case status pipeline</h2>
                <p className="mt-1 text-sm text-slate-400">A live view of operational throughput across workflows.</p>
              </div>
              <Bot className="h-5 w-5 text-cyan-200" />
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {pipeline.map((item) => (
                <div key={item.label} className="rounded-2xl border border-white/10 bg-white/[0.045] p-4">
                  <div className={`h-1.5 w-10 rounded-full ${item.color}`} />
                  <div className="mt-4 text-2xl font-semibold text-white">{item.value}</div>
                  <div className="mt-1 text-xs font-medium uppercase tracking-wide text-slate-500">{item.label}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-card rounded-3xl p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white">Sponsor Integrations</h2>
              <span className="rounded-full bg-emerald-400/10 px-3 py-1 text-xs font-bold text-emerald-200">Demo ready</span>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              {statuses.map((item) => (
                <IntegrationBadge key={item.name} status={item} />
              ))}
            </div>
          </div>
        </section>

        <section className="glass-card rounded-3xl p-5">
          <div className="mb-5 flex items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold text-white">Live cases</h2>
              <p className="mt-1 text-sm text-slate-400">No tables. Just the cases a founder can demo on stage.</p>
            </div>
            <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-sm font-semibold text-slate-200">{cases.length} total</span>
          </div>

          {cases.length ? (
            <div className="grid gap-3">
              {cases.map((item) => (
                <CaseCard key={item.id} record={item} />
              ))}
            </div>
          ) : (
            <div className="rounded-3xl border border-dashed border-cyan-300/25 bg-cyan-300/5 p-10 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-300/10">
                <Bot className="h-6 w-6 text-cyan-200" />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-white">No cases yet</h3>
              <p className="mt-2 text-sm text-slate-400">Start a workflow demo to populate the command center.</p>
              <Link href="/demo" className="mt-5 inline-flex rounded-2xl bg-white px-4 py-3 text-sm font-bold text-slate-950 hover:bg-cyan-100">
                Start first demo
              </Link>
            </div>
          )}
        </section>
      </div>
    </PageShell>
  );
}
