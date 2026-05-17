"use client";

import { useState } from "react";

export function DemoModeToggle() {
  const [enabled, setEnabled] = useState(true);
  return (
    <button
      type="button"
      onClick={() => setEnabled((value) => !value)}
      className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm font-bold text-white transition hover:border-cyan-300/40"
      aria-pressed={enabled}
    >
      <span className={`relative h-6 w-11 rounded-full transition ${enabled ? "bg-cyan-400" : "bg-slate-600"}`}>
        <span className={`absolute top-1 h-4 w-4 rounded-full bg-white transition ${enabled ? "left-6" : "left-1"}`} />
      </span>
      Demo Mode
    </button>
  );
}
