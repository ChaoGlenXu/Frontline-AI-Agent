import Link from "next/link";
import { ArrowLeft, Zap } from "lucide-react";
import { DemoControls } from "@/components/DemoControls";
import { DemoModeToggle } from "@/components/DemoModeToggle";
import { AIProviderToggle } from "@/components/AIProviderToggle";
import { PageHeader, PageShell } from "@/components/ui-shell";

export default function DemoPage() {
  return (
    <PageShell>
      <div className="space-y-6">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-400 transition hover:text-white">
          <ArrowLeft className="h-4 w-4" />
          Back to command center
        </Link>
        <PageHeader
          eyebrow="YC hackathon demo"
          title="Launch a live workflow"
          subtitle="Each scenario creates a realistic case, simulates sponsor integrations, and moves through conversation, extraction, workflow, and audit trail."
          action={
            <div className="flex flex-col gap-3">
              <AIProviderToggle />
              <DemoModeToggle />
            </div>
          }
        />
        <div className="rounded-3xl border border-cyan-300/20 bg-cyan-300/8 p-5 text-sm leading-6 text-cyan-50">
          <div className="flex items-center gap-2 font-semibold text-white">
            <Zap className="h-4 w-4 text-cyan-200" />
            Stage script
          </div>
          <p className="mt-2 text-slate-300">
            Start a scenario, send one suggested inbound message, then show the structured JSON, Moss context, Supermemory panel, AgentMail summary, and audit log.
          </p>
        </div>
        <DemoControls />
      </div>
    </PageShell>
  );
}
