"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarCheck, CheckCircle2, Mail, Pencil, XCircle } from "lucide-react";
import { readStoredUserProfile } from "@/components/UserProfileCard";

type CalendarSlot = {
  id: string;
  day: string;
  time: string;
  provider: string;
  status: "available" | "booked";
  patient?: string;
};

const seedSlots: CalendarSlot[] = [
  { id: "mon-0900", day: "Monday", time: "9:00 AM", provider: "Dr. Patel", status: "booked", patient: "Jordan Lee" },
  { id: "mon-1130", day: "Monday", time: "11:30 AM", provider: "Dr. Patel", status: "available" },
  { id: "tue-1430", day: "Tuesday", time: "2:30 PM", provider: "Dr. Rivera", status: "available" },
  { id: "wed-1000", day: "Wednesday", time: "10:00 AM", provider: "Dr. Chen", status: "booked", patient: "Nina Park" },
  { id: "thu-1000", day: "Thursday", time: "10:00 AM", provider: "Dr. Rivera", status: "booked", patient: "Avery Kim" },
  { id: "fri-1530", day: "Friday", time: "3:30 PM", provider: "Dr. Chen", status: "available" }
];

export function DentalCalendar({
  caseId,
  contactName,
  caseEmail,
  selectedAppointment
}: {
  caseId: string;
  contactName?: string;
  caseEmail?: string;
  selectedAppointment?: unknown;
}) {
  const storageKey = `frontline.dentalCalendar.${caseId}`;
  const [slots, setSlots] = useState<CalendarSlot[]>(seedSlots);
  const [selectedSlotId, setSelectedSlotId] = useState("");
  const [sendConfirmation, setSendConfirmation] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(storageKey);
      if (stored) setSlots(JSON.parse(stored) as CalendarSlot[]);
    } catch {
      setSlots(seedSlots);
    }
  }, [storageKey]);

  useEffect(() => {
    window.localStorage.setItem(storageKey, JSON.stringify(slots));
  }, [slots, storageKey]);

  const selectedSlot = useMemo(() => slots.find((slot) => slot.id === selectedSlotId), [selectedSlotId, slots]);
  const storedEmail = typeof window !== "undefined" ? readStoredUserProfile().email : "";
  const recipientEmail = caseEmail || storedEmail;

  async function patchCase(slot: CalendarSlot, sendEmail: boolean) {
    setBusy(slot.id);
    const appointment = `${slot.day} ${slot.time} with ${slot.provider}`;
    await fetch(`/api/cases/${caseId}/patch`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: recipientEmail || undefined,
        status: "booked",
        nextAction: sendEmail && recipientEmail ? "Appointment booked and confirmation email sent" : "Appointment booked",
        summary: `Booked dental appointment for ${contactName ?? "patient"} at ${appointment}.`,
        extractedFields: {
          preferredTime: appointment,
          appointmentSlotId: slot.id,
          appointmentProvider: slot.provider,
          appointmentType: "routine cleaning",
          bookingConfirmed: true,
          email: recipientEmail || undefined
        },
        auditEvent: "calendar.appointment.booked",
        auditDetails: {
          appointment,
          slotId: slot.id,
          sendConfirmation: sendEmail,
          recipientEmail: recipientEmail || null
        },
        systemMessage: `Dental appointment booked for ${appointment}.`
      })
    });

    if (sendEmail && recipientEmail) {
      await fetch("/api/send-summary-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caseId, recipientEmail })
      });
    }

    setNotice(sendEmail && recipientEmail ? `Booked and emailed ${recipientEmail}` : "Appointment booked locally");
    setBusy(null);
  }

  function toggleSlot(slot: CalendarSlot) {
    setSlots((current) =>
      current.map((item) =>
        item.id === slot.id
          ? {
              ...item,
              status: item.status === "booked" ? "available" : "booked",
              patient: item.status === "booked" ? undefined : contactName ?? "Demo patient"
            }
          : item
      )
    );
  }

  async function bookSelected() {
    if (!selectedSlot) return;
    const updatedSlot: CalendarSlot = {
      ...selectedSlot,
      status: "booked",
      patient: contactName ?? "Demo patient"
    };
    setSlots((current) => current.map((slot) => (slot.id === updatedSlot.id ? updatedSlot : slot)));
    await patchCase(updatedSlot, sendConfirmation);
  }

  return (
    <section className="glass-card rounded-3xl p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xl font-semibold text-white">
            <CalendarCheck className="h-5 w-5 text-cyan-200" />
            Live dental calendar
          </div>
          <p className="mt-1 text-sm text-slate-400">Seeded mock schedule with editable booked and open appointment slots.</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.045] px-3 py-2 text-xs text-slate-300">
          Current: {typeof selectedAppointment === "string" ? selectedAppointment : "not booked"}
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {slots.map((slot) => {
          const selected = selectedSlotId === slot.id;
          const booked = slot.status === "booked";
          return (
            <button
              key={slot.id}
              type="button"
              onClick={() => setSelectedSlotId(slot.id)}
              className={`rounded-2xl border p-4 text-left transition ${
                selected
                  ? "border-cyan-300/60 bg-cyan-400/12"
                  : booked
                    ? "border-amber-300/25 bg-amber-400/8 hover:border-amber-300/40"
                    : "border-white/10 bg-white/[0.045] hover:border-cyan-300/35 hover:bg-white/[0.07]"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="font-semibold text-white">{slot.day}</div>
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold uppercase ${booked ? "bg-amber-400/15 text-amber-100" : "bg-emerald-400/15 text-emerald-100"}`}>
                  {slot.status}
                </span>
              </div>
              <div className="mt-3 text-2xl font-semibold text-white">{slot.time}</div>
              <div className="mt-1 text-sm text-slate-400">{slot.provider}</div>
              {slot.patient && <div className="mt-3 text-xs text-amber-100">Booked: {slot.patient}</div>}
            </button>
          );
        })}
      </div>

      <div className="mt-5 grid gap-3 lg:grid-cols-[1fr_auto_auto]">
        <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.045] px-4 py-3 text-sm font-semibold text-slate-200">
          <input
            type="checkbox"
            checked={sendConfirmation}
            onChange={(event) => setSendConfirmation(event.target.checked)}
            className="h-4 w-4 accent-cyan-300"
          />
          Send confirmation email {recipientEmail ? `to ${recipientEmail}` : "(save or say an email first)"}
        </label>
        <button
          type="button"
          onClick={bookSelected}
          disabled={!selectedSlot || busy !== null}
          className="rounded-2xl bg-white px-5 py-3 text-sm font-bold text-slate-950 transition hover:bg-cyan-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? "Booking..." : "Book selected slot"}
        </button>
        <button
          type="button"
          onClick={() => selectedSlot && toggleSlot(selectedSlot)}
          disabled={!selectedSlot}
          className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.06] px-5 py-3 text-sm font-bold text-white transition hover:border-cyan-300/40 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {selectedSlot?.status === "booked" ? <XCircle className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
          Toggle booked
        </button>
      </div>

      {notice && (
        <div className="mt-4 flex items-center gap-2 rounded-2xl border border-emerald-300/20 bg-emerald-400/10 px-4 py-3 text-sm font-semibold text-emerald-100">
          <CheckCircle2 className="h-4 w-4" />
          {notice}
        </div>
      )}
      {!recipientEmail && (
        <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
          <Mail className="h-3.5 w-3.5" />
          Save an email on the dashboard, start a new dental demo, or have the caller say an email to use AgentMail confirmation.
        </div>
      )}
    </section>
  );
}
