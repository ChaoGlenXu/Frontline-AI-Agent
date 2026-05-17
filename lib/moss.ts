import { knowledgeSeeds } from "@/lib/mockData";
import type { RetrievalSnippet, Vertical } from "@/lib/types";
import { v4 as uuid } from "uuid";
import { fetchWithTimeout } from "@/lib/http";

export async function searchMoss(query: string, vertical: Vertical, extractedFields: Record<string, unknown> = {}) {
  const apiKey = process.env.MOSS_PROJECT_KEY;
  const projectId = process.env.MOSS_PROJECT_ID;
  if (apiKey && projectId) {
    try {
      const response = await fetchWithTimeout(`https://api.moss.dev/v1/projects/${projectId}/search`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ query, metadata: { vertical, extractedFields }, topK: 4 })
      });
      const data = (await response.json().catch(() => ({}))) as { results?: Array<Record<string, unknown>> };
      if (response.ok && Array.isArray(data.results)) {
        return data.results.slice(0, 4).map((item): RetrievalSnippet => ({
          id: String(item.id ?? uuid()),
          source: "moss",
          title: String(item.title ?? item.name ?? "Moss result"),
          content: String(item.content ?? item.text ?? item.snippet ?? ""),
          score: typeof item.score === "number" ? item.score : undefined,
          createdAt: new Date().toISOString()
        }));
      }
    } catch {
      // Fall through to seeded mock retrieval.
    }
  }

  const terms = `${query} ${JSON.stringify(extractedFields)}`.toLowerCase().split(/\W+/).filter(Boolean);
  return knowledgeSeeds[vertical]
    .map((item): RetrievalSnippet => {
      const haystack = `${item.title} ${item.content}`.toLowerCase();
      return {
        id: uuid(),
        source: "mock",
        title: item.title,
        content: item.content,
        score: terms.reduce((score, term) => score + (haystack.includes(term) ? 1 : 0), 0),
        createdAt: new Date().toISOString()
      };
    })
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
    .slice(0, 3);
}
