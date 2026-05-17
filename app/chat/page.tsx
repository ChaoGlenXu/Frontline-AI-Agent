import Link from "next/link";
import { Suspense } from "react";
import { ArrowLeft } from "lucide-react";
import { ChatBox } from "@/components/ChatBox";
import { AIProviderToggle } from "@/components/AIProviderToggle";
import { PageHeader, PageShell } from "@/components/ui-shell";

export default function ChatPage() {
  return (
    <PageShell>
      <div className="space-y-6">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-400 transition hover:text-white">
          <ArrowLeft className="h-4 w-4" />
          Back to command center
        </Link>
        <PageHeader
          eyebrow="Web chat fallback"
          title="AI messaging console"
          subtitle="Test the exact same agent brain without AgentPhone. Quick scenarios make the demo feel live immediately."
          action={<AIProviderToggle />}
        />
        <Suspense fallback={<div className="text-sm text-slate-400">Loading chat...</div>}>
          <ChatBox />
        </Suspense>
      </div>
    </PageShell>
  );
}
