import { promises as fs } from "fs";
import path from "path";
import type { AIProvider, AppSettings } from "@/lib/types";

const dataDir = path.join(process.cwd(), "data");
const settingsPath = path.join(dataDir, "settings.json");

const defaultSettings: AppSettings = {
  aiProvider: "openai",
  updatedAt: new Date().toISOString()
};

async function ensureSettings() {
  await fs.mkdir(dataDir, { recursive: true });
  try {
    await fs.access(settingsPath);
  } catch {
    await fs.writeFile(settingsPath, JSON.stringify(defaultSettings, null, 2), "utf8");
  }
}

export async function getSettings(): Promise<AppSettings> {
  await ensureSettings();
  try {
    const raw = await fs.readFile(settingsPath, "utf8");
    const parsed = JSON.parse(raw) as Partial<AppSettings>;
    return {
      aiProvider: parsed.aiProvider === "gemini" ? "gemini" : "openai",
      updatedAt: parsed.updatedAt ?? new Date().toISOString()
    };
  } catch {
    return defaultSettings;
  }
}

export async function updateSettings(patch: { aiProvider?: AIProvider }) {
  const current = await getSettings();
  const next: AppSettings = {
    ...current,
    aiProvider: patch.aiProvider ?? current.aiProvider,
    updatedAt: new Date().toISOString()
  };
  await fs.writeFile(settingsPath, JSON.stringify(next, null, 2), "utf8");
  return next;
}
