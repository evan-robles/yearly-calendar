"use client";

import { useEffect, useState } from "react";
import { X, Plus, Trash2, Save, Pencil, Bell, BellOff, Repeat } from "lucide-react";
import {
  CATEGORIES,
  CATEGORY_LIST,
  RECURRENCE_LABELS,
  type CalendarEvent,
  type CategoryId,
  type RecurrenceFreq,
} from "@/lib/types";
import { formatLong } from "@/lib/date-utils";
import { LEAD_TIME_OPTIONS } from "@/lib/useReminders";
import type { Occurrence } from "@/lib/recurrence";
import { ConfirmDialog } from "./ConfirmDialog";

/** Draft shape produced by the form — id and updatedAt are assigned by the store. */
type EventDraft = Omit<CalendarEvent, "id" | "updatedAt">;

interface Props {
  date: string; // ISO YYYY-MM-DD
  occurrences: Occurrence[];
  onClose: () => void;
  onAdd: (draft: EventDraft) => void;
  onUpdate: (id: string, updates: Partial<Omit<CalendarEvent, "id">>) => void;
  onDelete: (id: string) => void;
  /** Toggle completion for the occurrence on THIS date (handles recurring). */
  onToggleComplete: (id: string, date: string) => void;
}

export function DayDrawer({ date, occurrences, onClose, onAdd, onUpdate, onDelete, onToggleComplete }: Props) {
  const [composing, setComposing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<CalendarEvent | null>(null);

  // Close on Escape (unless a nested confirm is open, which handles its own Esc).
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !pendingDelete) onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose, pendingDelete]);

  // Reset transient UI state when the drawer is opened on a different date.
  useEffect(() => {
    setComposing(false);
    setEditingId(null);
    setPendingDelete(null);
  }, [date]);

  return (
    <div className="fixed inset-0 z-30 flex">
      {/* Backdrop */}
      <div
        className="flex-1 bg-black/30 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <aside className="thin-scroll flex w-full max-w-md flex-col overflow-y-auto bg-white shadow-2xl sm:max-w-lg">
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-neutral-200 bg-white px-4 py-3">
          <div>
            <p className="text-xs uppercase tracking-wider text-neutral-500">{occurrences.length} event{occurrences.length === 1 ? "" : "s"}</p>
            <h2 className="text-lg font-semibold">{formatLong(date)}</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-neutral-500 hover:bg-neutral-100"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="flex flex-col gap-3 p-4">
          {occurrences.length === 0 && !composing && (
            <p className="text-sm text-neutral-500">No events on this day.</p>
          )}

          {occurrences.map((occ) => {
            const event = occ.event;
            return editingId === event.id ? (
              <EventForm
                key={event.id + occ.date}
                initial={event}
                date={date}
                onCancel={() => setEditingId(null)}
                onSubmit={(draft) => {
                  onUpdate(event.id, draft);
                  setEditingId(null);
                }}
              />
            ) : (
              <EventCard
                key={event.id + occ.date}
                event={event}
                occurrenceCompleted={occ.completed}
                onEdit={() => setEditingId(event.id)}
                onDelete={() => setPendingDelete(event)}
                onToggleComplete={() => onToggleComplete(event.id, occ.date)}
              />
            );
          })}

          {composing ? (
            <EventForm
              date={date}
              onCancel={() => setComposing(false)}
              onSubmit={(draft) => {
                onAdd(draft);
                setComposing(false);
              }}
            />
          ) : (
            <button
              onClick={() => setComposing(true)}
              className="inline-flex items-center justify-center gap-1.5 rounded-md border border-dashed border-neutral-300 bg-white px-3 py-2 text-sm font-medium text-neutral-700 hover:border-neutral-500 hover:bg-neutral-50"
            >
              <Plus className="h-4 w-4" />
              Add event
            </button>
          )}
        </div>
      </aside>

      {pendingDelete && (
        <ConfirmDialog
          title="Delete event?"
          message={
            `Delete "${pendingDelete.title}"?` +
            (pendingDelete.recurrence ? "\nThis deletes the entire recurring series." : "")
          }
          confirmLabel="Delete"
          destructive
          onCancel={() => setPendingDelete(null)}
          onConfirm={() => {
            onDelete(pendingDelete.id);
            setPendingDelete(null);
          }}
        />
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Event Card — readonly view of one event.
// ──────────────────────────────────────────────────────────────────────────

function EventCard({
  event,
  occurrenceCompleted,
  onEdit,
  onDelete,
  onToggleComplete,
}: {
  event: CalendarEvent;
  /** Completion of THIS occurrence (differs from event.completed for series). */
  occurrenceCompleted: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onToggleComplete: () => void;
}) {
  const cat = CATEGORIES[event.category];
  const done = occurrenceCompleted;
  return (
    <article
      className="rounded-md border border-neutral-200 p-3"
      style={{ borderLeftWidth: 4, borderLeftColor: cat.accent }}
    >
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={done}
          onChange={onToggleComplete}
          className="mt-0.5 h-4 w-4 cursor-pointer rounded border-neutral-300"
          aria-label={done ? "Mark not done" : "Mark done"}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span
              className="rounded-sm px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider"
              style={{ backgroundColor: cat.bg, color: cat.accent }}
            >
              {cat.id}
            </span>
            <h3
              className={
                "truncate text-sm font-semibold " +
                (done ? "text-neutral-400 line-through" : "text-neutral-900")
              }
            >
              {event.title}
            </h3>
            {event.recurrence && (
              <span
                className="inline-flex shrink-0 items-center gap-0.5 rounded-sm bg-neutral-100 px-1 py-0.5 text-[9px] font-medium uppercase tracking-wider text-neutral-500"
                title={`Repeats ${RECURRENCE_LABELS[event.recurrence.freq]}`}
              >
                <Repeat className="h-2.5 w-2.5" />
                {RECURRENCE_LABELS[event.recurrence.freq]}
              </span>
            )}
          </div>
          {event.description && (
            <p
              className={
                "mt-1 text-xs leading-relaxed " +
                (done ? "text-neutral-400 line-through" : "text-neutral-600")
              }
            >
              {event.description}
            </p>
          )}
          <ReminderBadge event={event} />
        </div>
        <div className="flex shrink-0 gap-1">
          <button
            onClick={onEdit}
            className="rounded p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
            aria-label="Edit"
            title="Edit"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            onClick={onDelete}
            className="rounded p-1 text-neutral-400 hover:bg-red-50 hover:text-red-600"
            aria-label="Delete"
            title="Delete"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </article>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Reminder Badge — small inline summary of an event's reminder settings.
// ──────────────────────────────────────────────────────────────────────────

function ReminderBadge({ event }: { event: CalendarEvent }) {
  // Default reminders (no override) — only shown for time-sensitive categories
  // since otherwise nothing fires.
  if (event.reminderDays === undefined) {
    if (!["DEADLINE", "MILESTONE", "UCHICAGO"].includes(event.category)) return null;
    return (
      <p className="mt-1 inline-flex items-center gap-1 text-[10px] text-neutral-500">
        <Bell className="h-3 w-3" />
        Default reminders (7, 3, 1, day-of)
      </p>
    );
  }
  if (event.reminderDays.length === 0) {
    return (
      <p className="mt-1 inline-flex items-center gap-1 text-[10px] text-neutral-400">
        <BellOff className="h-3 w-3" />
        No reminders
      </p>
    );
  }
  const labels = event.reminderDays
    .slice()
    .sort((a, b) => b - a)
    .map((d) => (d === 0 ? "day-of" : `${d}d`))
    .join(", ");
  return (
    <p className="mt-1 inline-flex items-center gap-1 text-[10px] text-blue-700">
      <Bell className="h-3 w-3" />
      Reminds: {labels}
    </p>
  );
}

function EventForm({
  initial,
  date,
  onSubmit,
  onCancel,
}: {
  initial?: CalendarEvent;
  date: string;
  onSubmit: (draft: EventDraft) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [category, setCategory] = useState<CategoryId>(initial?.category ?? "REMINDER");
  const [eventDate, setEventDate] = useState<string>(initial?.date ?? date);
  const [completed, setCompleted] = useState<boolean>(initial?.completed ?? false);

  // Recurrence. "" = does not repeat; otherwise a RecurrenceFreq. `until` optional.
  const [recurFreq, setRecurFreq] = useState<RecurrenceFreq | "">(initial?.recurrence?.freq ?? "");
  const [recurUntil, setRecurUntil] = useState<string>(initial?.recurrence?.until ?? "");

  // Reminder customization. Three modes:
  //   "default" → reminderDays === undefined (use global defaults if category eligible)
  //   "none"    → reminderDays === [] (silence this event)
  //   "custom"  → reminderDays === [user-picked days]
  type ReminderMode = "default" | "none" | "custom";
  const initialMode: ReminderMode =
    initial?.reminderDays === undefined
      ? "default"
      : initial.reminderDays.length === 0
        ? "none"
        : "custom";
  const [reminderMode, setReminderMode] = useState<ReminderMode>(initialMode);
  const [customDays, setCustomDays] = useState<number[]>(
    initial?.reminderDays && initial.reminderDays.length > 0 ? initial.reminderDays : [7, 1, 0]
  );

  const submit = () => {
    if (!title.trim()) return;
    const reminderDays =
      reminderMode === "default"
        ? undefined
        : reminderMode === "none"
          ? []
          : [...customDays].sort((a, b) => b - a);
    const recurrence = recurFreq
      ? { freq: recurFreq, until: recurUntil || undefined }
      : undefined;
    onSubmit({
      title: title.trim(),
      description: description.trim() || undefined,
      category,
      date: eventDate,
      completed,
      reminderDays,
      recurrence,
      // Preserve per-occurrence completion when editing; drop it if recurrence
      // was turned off.
      completedDates: recurrence ? initial?.completedDates : undefined,
    });
  };

  const toggleDay = (d: number) => {
    setCustomDays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]));
  };

  return (
    <form
      className="rounded-md border border-neutral-300 bg-neutral-50 p-3"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <div className="space-y-2">
        <label className="block">
          <span className="block text-[11px] font-medium uppercase tracking-wider text-neutral-500">Title</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Amgen Scholars deadline"
            autoFocus
            className="mt-0.5 w-full rounded-md border border-neutral-300 bg-white px-2 py-1.5 text-sm focus:border-neutral-500 focus:outline-none"
          />
        </label>

        <div className="grid grid-cols-2 gap-2">
          <label className="block">
            <span className="block text-[11px] font-medium uppercase tracking-wider text-neutral-500">Date</span>
            <input
              type="date"
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
              className="mt-0.5 w-full rounded-md border border-neutral-300 bg-white px-2 py-1.5 text-sm focus:border-neutral-500 focus:outline-none"
            />
          </label>
          <label className="block">
            <span className="block text-[11px] font-medium uppercase tracking-wider text-neutral-500">Category</span>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as CategoryId)}
              className="mt-0.5 w-full rounded-md border border-neutral-300 bg-white px-2 py-1.5 text-sm focus:border-neutral-500 focus:outline-none"
            >
              {CATEGORY_LIST.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.id} — {c.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="block">
          <span className="block text-[11px] font-medium uppercase tracking-wider text-neutral-500">Description (optional)</span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="mt-0.5 w-full rounded-md border border-neutral-300 bg-white px-2 py-1.5 text-sm focus:border-neutral-500 focus:outline-none"
          />
        </label>

        {/* Recurrence */}
        <div className="grid grid-cols-2 gap-2">
          <label className="block">
            <span className="block text-[11px] font-medium uppercase tracking-wider text-neutral-500">Repeats</span>
            <select
              value={recurFreq}
              onChange={(e) => setRecurFreq(e.target.value as RecurrenceFreq | "")}
              className="mt-0.5 w-full rounded-md border border-neutral-300 bg-white px-2 py-1.5 text-sm focus:border-neutral-500 focus:outline-none"
            >
              <option value="">Does not repeat</option>
              {(Object.keys(RECURRENCE_LABELS) as RecurrenceFreq[]).map((f) => (
                <option key={f} value={f}>
                  {RECURRENCE_LABELS[f]}
                </option>
              ))}
            </select>
          </label>
          {recurFreq && (
            <label className="block">
              <span className="block text-[11px] font-medium uppercase tracking-wider text-neutral-500">Until (optional)</span>
              <input
                type="date"
                value={recurUntil}
                min={eventDate}
                onChange={(e) => setRecurUntil(e.target.value)}
                className="mt-0.5 w-full rounded-md border border-neutral-300 bg-white px-2 py-1.5 text-sm focus:border-neutral-500 focus:outline-none"
              />
            </label>
          )}
        </div>

        {/* Per-event reminders */}
        <div>
          <span className="block text-[11px] font-medium uppercase tracking-wider text-neutral-500">Reminders</span>
          <div className="mt-0.5 space-y-1.5 rounded-md border border-neutral-300 bg-white p-2 text-sm">
            <label className="flex cursor-pointer items-start gap-2">
              <input
                type="radio"
                name={`rem-${initial?.id ?? "new"}`}
                checked={reminderMode === "default"}
                onChange={() => setReminderMode("default")}
                className="mt-0.5"
              />
              <span>
                <span className="font-medium">Default</span>
                <span className="block text-xs text-neutral-500">
                  7, 3, 1, and 0 days before — only for Deadline / Milestone / UChicago events.
                </span>
              </span>
            </label>
            <label className="flex cursor-pointer items-start gap-2">
              <input
                type="radio"
                name={`rem-${initial?.id ?? "new"}`}
                checked={reminderMode === "none"}
                onChange={() => setReminderMode("none")}
                className="mt-0.5"
              />
              <span>
                <span className="font-medium">None</span>
                <span className="block text-xs text-neutral-500">No reminders for this event.</span>
              </span>
            </label>
            <label className="flex cursor-pointer items-start gap-2">
              <input
                type="radio"
                name={`rem-${initial?.id ?? "new"}`}
                checked={reminderMode === "custom"}
                onChange={() => setReminderMode("custom")}
                className="mt-0.5"
              />
              <span className="flex-1">
                <span className="font-medium">Custom</span>
                <span className="block text-xs text-neutral-500">
                  Pick lead times below. Fires regardless of category.
                </span>
                {reminderMode === "custom" && (
                  <div className="mt-1.5 grid grid-cols-3 gap-1 sm:grid-cols-4">
                    {LEAD_TIME_OPTIONS.map((d) => {
                      const checked = customDays.includes(d);
                      return (
                        <label
                          key={d}
                          className={
                            "flex cursor-pointer items-center gap-1.5 rounded-sm border px-1.5 py-1 text-xs " +
                            (checked
                              ? "border-blue-400 bg-blue-50 text-blue-800"
                              : "border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50")
                          }
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleDay(d)}
                            className="h-3 w-3"
                          />
                          {d === 0 ? "Day of" : `${d}d before`}
                        </label>
                      );
                    })}
                  </div>
                )}
                {reminderMode === "custom" && customDays.length === 0 && (
                  <span className="mt-1 block text-xs text-amber-700">
                    Pick at least one lead time, or switch to "None".
                  </span>
                )}
              </span>
            </label>
          </div>
        </div>

        {initial && (
          <label className="flex items-center gap-2 text-sm text-neutral-700">
            <input
              type="checkbox"
              checked={completed}
              onChange={(e) => setCompleted(e.target.checked)}
              className="h-4 w-4 rounded border-neutral-300"
            />
            Mark as done
          </label>
        )}

        <div className="flex items-center justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md px-3 py-1.5 text-sm text-neutral-600 hover:bg-neutral-100"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!title.trim() || (reminderMode === "custom" && customDays.length === 0)}
            className="inline-flex items-center gap-1.5 rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Save className="h-3.5 w-3.5" />
            {initial ? "Save" : "Add"}
          </button>
        </div>
      </div>
    </form>
  );
}
