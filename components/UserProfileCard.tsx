"use client";

import { FormEvent, useEffect, useState } from "react";
import { CheckCircle2, Mail, Phone, User } from "lucide-react";

export type StoredUserProfile = {
  name: string;
  phone: string;
  email: string;
};

export const profileStorageKey = "frontline.userProfile";

export function readStoredUserProfile(): StoredUserProfile {
  if (typeof window === "undefined") return { name: "", phone: "", email: "" };
  try {
    const parsed = JSON.parse(window.localStorage.getItem(profileStorageKey) ?? "{}") as Partial<StoredUserProfile>;
    return {
      name: parsed.name ?? "",
      phone: parsed.phone ?? "",
      email: parsed.email ?? ""
    };
  } catch {
    return { name: "", phone: "", email: "" };
  }
}

export function UserProfileCard() {
  const [profile, setProfile] = useState<StoredUserProfile>({ name: "", phone: "", email: "" });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setProfile(readStoredUserProfile());
  }, []);

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    window.localStorage.setItem(profileStorageKey, JSON.stringify(profile));
    window.dispatchEvent(new CustomEvent("frontline-profile-updated", { detail: profile }));
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1800);
  }

  return (
    <section className="glass-card rounded-3xl p-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">Demo user profile</h2>
          <p className="mt-1 text-sm text-slate-400">Saved in this browser and copied into new demo cases.</p>
        </div>
        {saved && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-400/12 px-3 py-1 text-xs font-bold text-emerald-100">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Saved locally
          </span>
        )}
      </div>

      <form onSubmit={save} className="mt-5 grid gap-3 lg:grid-cols-[1fr_1fr_1fr_auto]">
        <ProfileInput
          icon={User}
          label="Name"
          value={profile.name}
          placeholder="Chao"
          onChange={(value) => setProfile((current) => ({ ...current, name: value }))}
        />
        <ProfileInput
          icon={Phone}
          label="Phone"
          value={profile.phone}
          placeholder="+13106222100"
          onChange={(value) => setProfile((current) => ({ ...current, phone: value }))}
        />
        <ProfileInput
          icon={Mail}
          label="Email"
          value={profile.email}
          placeholder="you@example.com"
          onChange={(value) => setProfile((current) => ({ ...current, email: value }))}
        />
        <button
          type="submit"
          className="rounded-2xl bg-white px-5 py-3 text-sm font-bold text-slate-950 transition hover:scale-[1.01] hover:bg-cyan-100"
        >
          Save
        </button>
      </form>
    </section>
  );
}

function ProfileInput({
  label,
  value,
  placeholder,
  onChange,
  icon: Icon
}: {
  label: string;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <label className="block">
      <span className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
        <Icon className="h-3.5 w-3.5 text-cyan-200" />
        {label}
      </span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-white outline-none ring-cyan-400/40 placeholder:text-slate-600 focus:ring-2"
      />
    </label>
  );
}
