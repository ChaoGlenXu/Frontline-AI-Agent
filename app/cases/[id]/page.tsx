import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Bot, Braces, Mail, Phone, Search, ShieldAlert, Sparkles } from "lucide-react";
import { AIProviderToggle } from "@/components/AIProviderToggle";
import { CaseActions } from "@/components/CaseActions";
import { DentalCalendar } from "@/components/DentalCalendar";
import { InboundSimulator } from "@/components/InboundSimulator";
import {
  AuditLogItem,
  IntegrationBadge,
  PageHeader,
  PageShell,
  StatusBadge,
  TranscriptBubble
} from "@/components/ui-shell";
import { sponsorStatuses } from "@/lib/status";
import { getCase } from "@/lib/store";

export default async function CaseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const record = await getCase(id);
  if (!record) notFound();

  return (
    <PageShell>
      <div className="space-y-6">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-400 transition hover:text-white">
          <ArrowLeft className="h-4 w-4" />
          Back to command center
        </Link>

        <PageHeader
          eyebrow="Enterprise agent console"
          title={record.title}
          subtitle={`${record.contactName ?? "Unknown contact"} · ${record.phone ?? "No phone"}${record.email ? ` · ${record.email}` : ""}`}
          action={
            <div className="flex flex-col gap-3">
              <AIProviderToggle />
              <StatusBadge status={record.status} />
              <Link href={`/chat?caseId=${record.id}`} className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm font-bold text-white transition hover:border-cyan-300/50 hover:bg-white/15">
                Open chatbox
              </Link>
            </div>
          }
        />

        <section className="grid gap-4 md:grid-cols-4">
          {sponsorStatuses().slice(0, 4).map((item) => (
            <IntegrationBadge key={item.name} status={item} />
          ))}
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="space-y-5">
            <div className="glass-card rounded-3xl p-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold text-white">Transcript timeline</h2>
                  <p className="mt-1 text-sm text-slate-400">SMS, voice, and chat messages converge into one operational thread.</p>
                </div>
                <Phone className="h-5 w-5 text-cyan-200" />
              </div>
              <div className="mt-5 max-h-[620px] space-y-3 overflow-auto pr-1">
                {record.messages.map((item) => (
                  <TranscriptBubble key={item.id} item={item} />
                ))}
              </div>
            </div>

            <InboundSimulator caseId={record.id} phone={record.phone} vertical={record.vertical} />

            {record.vertical === "dental" && (
              <DentalCalendar
                caseId={record.id}
                contactName={record.contactName}
                caseEmail={record.email}
                selectedAppointment={record.extractedFields.preferredTime}
              />
            )}
          </div>

          <aside className="space-y-5">
            <CaseActions caseId={record.id} email={record.email} vertical={record.vertical} phone={record.phone} />

            <div className="glass-card rounded-3xl p-5">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-white">Decision state</h2>
                <Sparkles className="h-5 w-5 text-violet-200" />
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <Signal label="Next action" value={record.nextAction} icon={Bot} />
                <Signal label="Risk level" value={record.riskLevel ?? "pending"} icon={ShieldAlert} />
              </div>
              <p className="mt-4 rounded-2xl border border-white/10 bg-white/[0.045] p-4 text-sm leading-6 text-slate-300">
                {record.summary}
              </p>
            </div>

            <div className="glass-card rounded-3xl p-5">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-semibold text-white">Extracted fields</h2>
                <Braces className="h-5 w-5 text-cyan-200" />
              </div>
              <pre className="max-h-[360px] overflow-auto rounded-2xl border border-white/10 bg-black/35 p-4 text-xs leading-6 text-cyan-50">
                {JSON.stringify(record.extractedFields, null, 2)}
              </pre>
            </div>

            <ContextPanel
              title="Moss retrieval"
              icon={Search}
              empty="No retrieval snippets used yet."
              items={record.retrievalSnippets.map((item) => ({
                id: item.id,
                title: `${item.title} · ${item.source}`,
                body: item.content
              }))}
            />

            <ContextPanel
              title="Supermemory"
              icon={Bot}
              empty="No memory results used yet."
              items={record.memoryResults.map((item) => ({
                id: item.id,
                title: `${item.source} memory`,
                body: item.content
              }))}
            />

            <div className="glass-card rounded-3xl p-5">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-semibold text-white">Emails</h2>
                <Mail className="h-5 w-5 text-emerald-200" />
              </div>
              {record.sentEmails.length ? (
                <div className="space-y-3">
                  {record.sentEmails.map((email) => (
                    <div key={email.id} className="rounded-2xl border border-white/10 bg-white/[0.045] p-4">
                      <div className="text-sm font-semibold text-white">{email.recipientEmail}</div>
                      <div className="mt-1 text-xs text-slate-400">{email.subject}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="rounded-2xl border border-dashed border-white/10 bg-white/[0.035] p-4 text-sm text-slate-400">
                  No summary email sent yet.
                </p>
              )}
            </div>
          </aside>
        </section>

        <section className="glass-card rounded-3xl p-5">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-white">Audit trail</h2>
              <p className="mt-1 text-sm text-slate-400">Every agent decision and sponsor action is preserved for demo review.</p>
            </div>
            <span className="rounded-full bg-white/10 px-3 py-1 text-sm font-semibold text-slate-200">{record.auditLogs.length} events</span>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {record.auditLogs.map((event) => (
              <AuditLogItem key={event.id} event={event} />
            ))}
          </div>
        </section>
      </div>
    </PageShell>
  );
}

function Signal({ label, value, icon: Icon }: { label: string; value: string; icon: React.ComponentType<{ className?: string }> }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-4">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
        <Icon className="h-4 w-4 text-cyan-200" />
        {label}
      </div>
      <div className="mt-3 text-sm font-semibold text-white">{value}</div>
    </div>
  );
}

function ContextPanel({
  title,
  icon: Icon,
  items,
  empty
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  items: { id: string; title: string; body: string }[];
  empty: string;
}) {
  return (
    <div className="glass-card rounded-3xl p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-white">{title}</h2>
        <Icon className="h-5 w-5 text-cyan-200" />
      </div>
      {items.length ? (
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.id} className="rounded-2xl border border-white/10 bg-white/[0.045] p-4">
              <div className="text-sm font-semibold text-white">{item.title}</div>
              <p className="mt-2 text-xs leading-5 text-slate-400">{item.body}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="rounded-2xl border border-dashed border-white/10 bg-white/[0.035] p-4 text-sm text-slate-400">{empty}</p>
      )}
    </div>
  );
}
