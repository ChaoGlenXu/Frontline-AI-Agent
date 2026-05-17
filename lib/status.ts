import type { SponsorStatus } from "@/lib/types";

export function sponsorStatuses(): SponsorStatus[] {
  const now = new Date().toISOString();
  return [
    status("AgentPhone", Boolean(process.env.AGENTPHONE_API_KEY), "SMS webhook + outbound send ready"),
    status("AgentMail", Boolean(process.env.AGENTMAIL_API_KEY), "Summary email send ready"),
    status("Moss", Boolean(process.env.MOSS_PROJECT_ID && process.env.MOSS_PROJECT_KEY), "Semantic retrieval with seeded fallback"),
    status("Supermemory", Boolean(process.env.SUPERMEMORY_API_KEY), "Memory search/save with local fallback"),
    status(
      "OpenAI",
      Boolean(process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== "YOUR_OPENAI_API_KEY"),
      "Orchestration with deterministic fallback"
    ),
    status(
      "Gemini",
      Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== "YOUR_GEMINI_API_KEY"),
      "Alternative Gemini orchestration provider"
    )
  ].map((item) => ({ ...item, checkedAt: now }));
}

function status(name: SponsorStatus["name"], configured: boolean, detail: string): Omit<SponsorStatus, "checkedAt"> {
  return {
    name,
    configured,
    lastStatus: configured ? "ready" : "mock",
    detail: configured ? detail : `${detail}; using mock fallback`,
  };
}
