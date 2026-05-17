import { addLocalMemory, searchLocalMemory } from "@/lib/store";
import type { MemoryResult } from "@/lib/types";
import { fetchWithTimeout } from "@/lib/http";

export async function searchSupermemory(userId: string, query: string): Promise<MemoryResult[]> {
  if (process.env.SUPERMEMORY_API_KEY) {
    try {
      const response = await fetchWithTimeout("https://api.supermemory.ai/v1/search", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.SUPERMEMORY_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ q: query, userId, limit: 5 })
      });
      const data = (await response.json().catch(() => ({}))) as { results?: Array<Record<string, unknown>> };
      if (response.ok && Array.isArray(data.results)) {
        return data.results.slice(0, 5).map((item) => ({
          id: String(item.id),
          source: "supermemory" as const,
          content: String(item.content ?? item.text ?? ""),
          metadata: (item.metadata as Record<string, unknown> | undefined) ?? {},
          score: typeof item.score === "number" ? item.score : undefined,
          createdAt: String(item.createdAt ?? new Date().toISOString())
        }));
      }
    } catch {
      // Fall through to local memory.
    }
  }
  return searchLocalMemory(userId, query);
}

export async function saveSupermemory(userId: string, content: string, metadata: Record<string, unknown> = {}) {
  if (process.env.SUPERMEMORY_API_KEY) {
    try {
      const response = await fetchWithTimeout("https://api.supermemory.ai/v1/memories", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.SUPERMEMORY_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ userId, content, metadata })
      });
      if (response.ok) {
        const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;
        return {
          id: String(data.id ?? crypto.randomUUID()),
          source: "supermemory" as const,
          content,
          metadata,
          createdAt: new Date().toISOString()
        };
      }
    } catch {
      // Fall through to local memory.
    }
  }
  return addLocalMemory({ userId, content, metadata });
}
