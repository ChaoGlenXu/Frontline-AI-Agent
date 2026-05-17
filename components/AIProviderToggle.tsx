"use client";

import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import type { AIProvider } from "@/lib/types";

export function AIProviderToggle() {
  const [provider, setProvider] = useState<AIProvider>("openai");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/settings")
      .then((response) => response.json())
      .then((data) => {
        if (data.settings?.aiProvider === "gemini") setProvider("gemini");
      })
      .catch(() => undefined);
  }, []);

  async function update(nextProvider: AIProvider) {
    setProvider(nextProvider);
    setSaving(true);
    await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ aiProvider: nextProvider })
    }).catch(() => undefined);
    setSaving(false);
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/10 p-1.5 shadow-lg shadow-black/10">
      <div className="mb-1 flex items-center gap-2 px-2 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
        <Sparkles className="h-3 w-3 text-cyan-200" />
        AI Brain {saving ? "saving" : ""}
      </div>
      <div className="grid grid-cols-2 gap-1">
        {(["openai", "gemini"] as AIProvider[]).map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => update(item)}
            className={`rounded-xl px-3 py-2 text-sm font-bold capitalize transition ${
              provider === item ? "bg-white text-slate-950 shadow" : "text-slate-300 hover:bg-white/10 hover:text-white"
            }`}
          >
            {item}
          </button>
        ))}
      </div>
    </div>
  );
}
