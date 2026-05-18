"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarCheck, CheckCircle2, ChevronLeft, ChevronRight, Mail, Pencil, XCircle } from "lucide-react";
import { readStoredUserProfile } from "@/components/UserProfileCard";

type CalendarSlot = {
  id: string;
  date: string;
  time: string;
  provider: string;
  status: "available" | "booked";
  patient?: string;
};

const appointmentTimes = ["9:00 AM", "11:30 AM", "2:30 PM", "3:30 PM"];
const providers = ["Dr. Patel", "Dr. Rivera", "Dr. Chen", "Dr. Morgan"];

function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function buildSeedSlots(anchor = new Date()): CalendarSlot[] {
  const seededBooked = new Map([
    [`${dateKey(addDays(anchor, 1))}|9:00 AM`, "Jordan Lee"],
    [`${dateKey(addDays(anchor, 4))}|11:30 AM`, "Nina Park"],
    [`${dateKey(addDays(anchor, 8))}|2:30 PM`, "Avery Kim"],
    [`${dateKey(addDays(anchor, 15))}|3:30 PM`, "Sam Rivera"],
    [`${dateKey(addDays(anchor, 27))}|9:00 AM`, "Priya Shah"]
  ]);

  const slots: CalendarSlot[] = [];
  for (let offset = -10; offset <= 55; offset += 1) {
    const date = addDays(anchor, offset);
    const key = dateKey(date);
    appointmentTimes.forEach((time, index) => {
      const patient = seededBooked.get(`${key}|${time}`);
      slots.push({
        id: `${key}-${time.replace(/\W/g, "")}`,
        date: key,
        time,
        provider: providers[(date.getDate() + index) % providers.length],
        status: patient ? "booked" : "available",
        patient
      });
    });
  }
  return slots;
}

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
  const today = useMemo(() => new Date(), []);
  const todayKey = dateKey(today);
  const storageKey = `frontline.dentalCalendar.${caseId}`;
  const [visibleMonth, setVisibleMonth] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState(todayKey);
  const [slots, setSlots] = useState<CalendarSlot[]>(() => buildSeedSlots(today));
  const [selectedSlotId, setSelectedSlotId] = useState("");
  const [sendConfirmation, setSendConfirmation] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(storageKey);
      if (stored) setSlots(JSON.parse(stored) as CalendarSlot[]);
    } catch {
      setSlots(buildSeedSlots(today));
    }
  }, [storageKey, today]);

  useEffect(() => {
    window.localStorage.setItem(storageKey, JSON.stringify(slots));
  }, [slots, storageKey]);

  const selectedSlot = useMemo(() => slots.find((slot) => slot.id === selectedSlotId), [selectedSlotId, slots]);
  const storedEmail = typeof window !== "undefined" ? readStoredUserProfile().email : "";
  const recipientEmail = caseEmail || storedEmail;
  const monthDays = useMemo(() => getMonthDays(visibleMonth), [visibleMonth]);
  const selectedDateSlots = slots.filter((slot) => slot.date === selectedDate);
  const visibleMonthLabel = visibleMonth.toLocaleDateString(undefined, { month: "long", year: "numeric" });

  function goMonth(offset: number) {
    setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1));
    setSelectedSlotId("");
  }

  async function patchCase(slot: CalendarSlot, sendEmail: boolean) {
    setBusy(slot.id);
    const appointmentDate = new Date(`${slot.date}T12:00:00`).toLocaleDateString(undefined, {
      weekday: "long",
      month: "long",
      day: "numeric"
    });
    const appointment = `${appointmentDate} at ${slot.time} with ${slot.provider}`;
    await fetch(`/api/cases/${caseId}/patch`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: recipientEmail || undefined,
        status: "booked",
        nextAction: sendEmail && recipientEmail ? "Appointment booked and confirmation email sent" : "Appointment booked",
        summary: `Booked dental appointment for ${contactName ?? "patient"} on ${appointment}.`,
        extractedFields: {
          preferredTime: appointment,
          appointmentDate: slot.date,
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
          <p className="mt-1 text-sm text-slate-400">Month calendar with seeded booked appointments and editable demo slots.</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.045] px-3 py-2 text-xs text-slate-300">
          Today: {today.toLocaleDateString(undefined, { month: "short", day: "numeric" })}
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.045] p-3">
        <button
          type="button"
          onClick={() => goMonth(-1)}
          className="rounded-xl border border-white/10 bg-white/[0.05] p-2 text-slate-200 transition hover:border-cyan-300/40"
          aria-label="Previous month"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="text-base font-semibold text-white">{visibleMonthLabel}</div>
        <button
          type="button"
          onClick={() => goMonth(1)}
          className="rounded-xl border border-white/10 bg-white/[0.05] p-2 text-slate-200 transition hover:border-cyan-300/40"
          aria-label="Next month"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      <div className="mt-4 grid grid-cols-7 gap-1 text-center text-[11px] font-bold uppercase tracking-wide text-slate-500">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
          <div key={day} className="py-1">{day}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {monthDays.map((day, index) => {
          if (!day) return <div key={`blank-${index}`} className="min-h-16 rounded-xl border border-transparent" />;
          const key = dateKey(day);
          const daySlots = slots.filter((slot) => slot.date === key);
          const bookedCount = daySlots.filter((slot) => slot.status === "booked").length;
          const selected = key === selectedDate;
          const isToday = key === todayKey;
          return (
            <button
              key={key}
              type="button"
              onClick={() => {
                setSelectedDate(key);
                setSelectedSlotId("");
              }}
              className={`min-h-16 rounded-xl border p-2 text-left transition ${
                selected
                  ? "border-cyan-300/60 bg-cyan-400/12"
                  : isToday
                    ? "border-emerald-300/40 bg-emerald-400/10"
                    : "border-white/10 bg-white/[0.035] hover:border-cyan-300/35"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-white">{day.getDate()}</span>
                {isToday && <span className="rounded-full bg-emerald-400/20 px-1.5 py-0.5 text-[10px] font-bold text-emerald-100">Today</span>}
              </div>
              <div className="mt-2 flex gap-1">
                {daySlots.slice(0, 4).map((slot) => (
                  <span
                    key={slot.id}
                    className={`h-1.5 flex-1 rounded-full ${slot.status === "booked" ? "bg-amber-300" : "bg-emerald-300/70"}`}
                  />
                ))}
              </div>
              <div className="mt-1 text-[10px] text-slate-500">{bookedCount} booked</div>
            </button>
          );
        })}
      </div>

      <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="font-semibold text-white">
              {new Date(`${selectedDate}T12:00:00`).toLocaleDateString(undefined, {
                weekday: "long",
                month: "long",
                day: "numeric"
              })}
            </div>
            <div className="mt-1 text-xs text-slate-500">
              Current case appointment: {typeof selectedAppointment === "string" ? selectedAppointment : "not booked"}
            </div>
          </div>
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {selectedDateSlots.map((slot) => {
            const selected = slot.id === selectedSlotId;
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
                  <div className="text-xl font-semibold text-white">{slot.time}</div>
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold uppercase ${booked ? "bg-amber-400/15 text-amber-100" : "bg-emerald-400/15 text-emerald-100"}`}>
                    {slot.status}
                  </span>
                </div>
                <div className="mt-1 text-sm text-slate-400">{slot.provider}</div>
                {slot.patient && <div className="mt-3 text-xs text-amber-100">Booked: {slot.patient}</div>}
              </button>
            );
          })}
        </div>
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

function getMonthDays(month: Date) {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const last = new Date(month.getFullYear(), month.getMonth() + 1, 0);
  const days: Array<Date | null> = [];
  for (let i = 0; i < first.getDay(); i += 1) days.push(null);
  for (let day = 1; day <= last.getDate(); day += 1) {
    days.push(new Date(month.getFullYear(), month.getMonth(), day));
  }
  return days;
}
