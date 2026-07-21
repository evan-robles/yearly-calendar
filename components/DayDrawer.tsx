"use client";

import { useEffect, useState } from "react";
import { X, Plus, Trash2, Save, Pencil, Bell, BellOff, Repeat, Link2, ExternalLink } from "lucide-react";
import {
  RECURRENCE_LABELS,
  type CalendarEvent,
  type CategoryId,
  type EventLink,
  type Label,
  type RecurrenceFreq,
} from "@/lib/types";
import { formatLong } from "@/lib/date-utils";
import { LEAD_TIME_OPTIONS } from "@/lib/useReminders";
import { normalizeUrl, hostLabel } from "@/lib/validation";
import type { Occurrence } from "@/lib/recurrence";
import { ConfirmDialog } from "./ConfirmDialog";

/** Draft shape produced by the form — id and updatedAt are assigned by the store. */
type EventDraft = Omit<CalendarEvent, "id" | "updatedAt">;

interface Props {
  date: string; // ISO YYYY-MM-DD
  occurrences: Occurrence[];
  labels: Label[];
  getLabel: (id: string) => Label;
  /** Open the label manager (used by the form's "New label…" affordance). */
  onManageLabels: () => void;
  onClose: () => void;
  onAdd: (draft: EventDraft) => void;
  onUpdate: (id: string, updates: Partial<Omit<CalendarEvent, "id">>) => void;
  onDelete: (id: string) => void;
  /** Toggle completion for the occurrence on THIS date (handles recurring). */
  onToggleComplete: (id: string, date: string) => void;
}

export function DayDrawer({
  date,
  occurrences,
  labels,
  getLabel,
  onManageLabels,
  onClose,
  onAdd,
  onUpdate,
  onDelete,
  onToggleComplete,
}: Props) {
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
    <div className="fixed inset-0 z-40 flex">
      {/* Backdrop */}
      <div
        className="flex-1 animate-fade-in bg-ink/40 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <aside className="thin-scroll flex w-full max-w-md animate-slide-in-right flex-col overflow-y-auto bg-canvas shadow-pop sm:max-w-lg">
        <header className="glass sticky top-0 z-10 flex items-center justify-between border-b border-line px-5 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-brand">
              {occurrences.length} event{occurrences.length === 1 ? "" : "s"}
            </p>
            <h2 className="font-display text-lg font-semibold text-ink">{formatLong(date)}</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted transition-colors hover:bg-canvas hover:text-ink"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="flex flex-col gap-3 p-4">
          {occurrences.length === 0 && !composing && (
            <div className="rounded-2xl border border-dashed border-line bg-surface/50 py-10 text-center text-sm text-muted">
              Nothing planned for this day.
            </div>
          )}

          {occurrences.map((occ) => {
            const event = occ.event;
            return editingId === event.id ? (
              <EventForm
                key={event.id + occ.date}
                initial={event}
                date={date}
                labels={labels}
                onManageLabels={onManageLabels}
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
                cat={getLabel(event.category)}
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
              labels={labels}
              onManageLabels={onManageLabels}
              onCancel={() => setComposing(false)}
              onSubmit={(draft) => {
                onAdd(draft);
                setComposing(false);
              }}
            />
          ) : (
            <button
              onClick={() => setComposing(true)}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-line bg-surface px-3 py-2.5 text-sm font-semibold text-ink/70 transition-colors hover:border-brand hover:bg-brand-soft/40 hover:text-brand"
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
  cat,
  occurrenceCompleted,
  onEdit,
  onDelete,
  onToggleComplete,
}: {
  event: CalendarEvent;
  cat: Label;
  /** Completion of THIS occurrence (differs from event.completed for series). */
  occurrenceCompleted: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onToggleComplete: () => void;
}) {
  const done = occurrenceCompleted;
  return (
    <article
      className={
        "rounded-xl border border-line bg-surface p-3 shadow-soft transition-shadow hover:shadow-card " +
        (done ? "opacity-75" : "")
      }
      style={{ borderLeftWidth: 4, borderLeftColor: cat.accent }}
    >
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={done}
          onChange={onToggleComplete}
          className="mt-0.5 h-4 w-4 cursor-pointer rounded border-line accent-brand"
          aria-label={done ? "Mark not done" : "Mark done"}
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span
              className="rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider"
              style={{ backgroundColor: cat.bg, color: cat.accent }}
            >
              {cat.label}
            </span>
            {event.recurrence && (
              <span
                className="inline-flex shrink-0 items-center gap-0.5 rounded-md bg-canvas px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-muted"
                title={`Repeats ${RECURRENCE_LABELS[event.recurrence.freq]}`}
              >
                <Repeat className="h-2.5 w-2.5" />
                {RECURRENCE_LABELS[event.recurrence.freq]}
              </span>
            )}
          </div>
          <h3
            className={
              "mt-1 text-sm font-semibold " + (done ? "text-muted line-through" : "text-ink")
            }
          >
            {event.title}
          </h3>
          {event.description && (
            <p
              className={
                "mt-1 text-xs leading-relaxed " + (done ? "text-muted line-through" : "text-ink/70")
              }
            >
              {event.description}
            </p>
          )}

          {event.links && event.links.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {event.links.map((l, i) => (
                <a
                  key={i}
                  href={l.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex max-w-full items-center gap-1 rounded-lg border border-line bg-canvas px-2 py-1 text-xs font-medium text-brand transition-colors hover:border-brand hover:bg-brand-soft/50"
                  title={l.url}
                >
                  <Link2 className="h-3 w-3 shrink-0" />
                  <span className="truncate">{l.label}</span>
                  <ExternalLink className="h-2.5 w-2.5 shrink-0 opacity-60" />
                </a>
              ))}
            </div>
          )}

          <ReminderBadge event={event} cat={cat} />
        </div>
        <div className="flex shrink-0 gap-1">
          <button
            onClick={onEdit}
            className="rounded-lg p-1.5 text-muted transition-colors hover:bg-canvas hover:text-ink"
            aria-label="Edit"
            title="Edit"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            onClick={onDelete}
            className="rounded-lg p-1.5 text-muted transition-colors hover:bg-red-50 hover:text-red-600"
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

function ReminderBadge({ event, cat }: { event: CalendarEvent; cat: Label }) {
  // Default reminders (no override) — only shown when the event's LABEL is set to
  // auto-remind, since otherwise nothing fires.
  if (event.reminderDays === undefined) {
    if (!cat.remindByDefault) return null;
    return (
      <p className="mt-1 inline-flex items-center gap-1 text-[10px] text-muted">
        <Bell className="h-3 w-3" />
        Default reminders (7, 3, 1, day-of)
      </p>
    );
  }
  if (event.reminderDays.length === 0) {
    return (
      <p className="mt-1 inline-flex items-center gap-1 text-[10px] text-muted">
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
    <p className="mt-1 inline-flex items-center gap-1 text-[10px] text-brand">
      <Bell className="h-3 w-3" />
      Reminds: {labels}
    </p>
  );
}

function EventForm({
  initial,
  date,
  labels,
  onManageLabels,
  onSubmit,
  onCancel,
}: {
  initial?: CalendarEvent;
  date: string;
  labels: Label[];
  onManageLabels: () => void;
  onSubmit: (draft: EventDraft) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  // Default to the event's own label, else the first available label, else "".
  const [category, setCategory] = useState<CategoryId>(
    initial?.category ?? labels[0]?.id ?? ""
  );
  const [eventDate, setEventDate] = useState<string>(initial?.date ?? date);
  const [completed, setCompleted] = useState<boolean>(initial?.completed ?? false);

  // Recurrence. "" = does not repeat; otherwise a RecurrenceFreq. `until` optional.
  const [recurFreq, setRecurFreq] = useState<RecurrenceFreq | "">(initial?.recurrence?.freq ?? "");
  const [recurUntil, setRecurUntil] = useState<string>(initial?.recurrence?.until ?? "");

  // Named links. Draft rows may be partially filled; empty rows are dropped and
  // URLs are normalized (https:// prefixed) on submit.
  const [links, setLinks] = useState<EventLink[]>(initial?.links ?? []);

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
    // Normalize + drop empty/invalid link rows.
    const cleanLinks: EventLink[] = [];
    for (const l of links) {
      const url = normalizeUrl(l.url);
      if (!url) continue;
      cleanLinks.push({ label: l.label.trim() || hostLabel(url), url });
    }
    onSubmit({
      title: title.trim(),
      description: description.trim() || undefined,
      category,
      date: eventDate,
      completed,
      reminderDays,
      recurrence,
      links: cleanLinks.length ? cleanLinks : undefined,
      // Preserve per-occurrence completion when editing; drop it if recurrence
      // was turned off.
      completedDates: recurrence ? initial?.completedDates : undefined,
    });
  };

  const toggleDay = (d: number) => {
    setCustomDays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]));
  };

  const addLinkRow = () => setLinks((prev) => [...prev, { label: "", url: "" }]);
  const updateLink = (i: number, patch: Partial<EventLink>) =>
    setLinks((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  const removeLink = (i: number) => setLinks((prev) => prev.filter((_, idx) => idx !== i));

  const fieldClass =
    "mt-0.5 w-full rounded-lg border border-line bg-surface px-2.5 py-1.5 text-sm text-ink focus:border-brand focus:outline-none";
  const labelClass = "block text-[11px] font-semibold uppercase tracking-wider text-muted";

  return (
    <form
      className="animate-scale-in rounded-xl border border-line bg-surface p-3.5 shadow-card"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <div className="space-y-2">
        <label className="block">
          <span className={labelClass}>Title</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Amgen Scholars deadline"
            autoFocus
            className={fieldClass}
          />
        </label>

        <div className="grid grid-cols-2 gap-2">
          <label className="block">
            <span className={labelClass}>Date</span>
            <input
              type="date"
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
              className={fieldClass}
            />
          </label>
          <label className="block">
            <span className={labelClass}>Label</span>
            {labels.length > 0 ? (
              <select
                value={category}
                onChange={(e) => {
                  if (e.target.value === "__manage__") {
                    onManageLabels();
                    return;
                  }
                  setCategory(e.target.value as CategoryId);
                }}
                className={fieldClass}
              >
                {/* If the event references a label that no longer exists, keep it
                    selectable so editing doesn't silently reassign it. */}
                {category && !labels.some((l) => l.id === category) && (
                  <option value={category}>(unlabeled)</option>
                )}
                {labels.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
                <option value="__manage__">＋ Manage labels…</option>
              </select>
            ) : (
              <button
                type="button"
                onClick={onManageLabels}
                className={fieldClass + " text-left text-brand hover:bg-brand-soft/40"}
              >
                ＋ Create a label…
              </button>
            )}
          </label>
        </div>

        <label className="block">
          <span className={labelClass}>Description (optional)</span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className={fieldClass}
          />
        </label>

        {/* Links */}
        <div>
          <span className={labelClass}>Links (optional)</span>
          <div className="mt-0.5 space-y-1.5">
            {links.map((l, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <input
                  value={l.label}
                  onChange={(e) => updateLink(i, { label: e.target.value })}
                  placeholder="Label"
                  className="w-28 shrink-0 rounded-lg border border-line bg-surface px-2 py-1.5 text-sm text-ink focus:border-brand focus:outline-none"
                />
                <input
                  value={l.url}
                  onChange={(e) => updateLink(i, { url: e.target.value })}
                  placeholder="https://…  or  file:///…"
                  inputMode="url"
                  className="min-w-0 flex-1 rounded-lg border border-line bg-surface px-2 py-1.5 text-sm text-ink focus:border-brand focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => removeLink(i)}
                  className="shrink-0 rounded-lg p-1.5 text-muted transition-colors hover:bg-red-50 hover:text-red-600"
                  aria-label="Remove link"
                  title="Remove link"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={addLinkRow}
              className="inline-flex items-center gap-1 rounded-lg border border-dashed border-line px-2 py-1 text-xs font-medium text-ink/70 transition-colors hover:border-brand hover:text-brand"
            >
              <Link2 className="h-3 w-3" />
              Add link
            </button>
            {links.some((l) => l.url.trim().toLowerCase().startsWith("file:")) && (
              <p className="mt-1 text-[11px] leading-snug text-muted">
                Local <span className="font-mono">file://</span> links open only when
                this calendar is opened locally &mdash; browsers block them from the
                live (https) site.
              </p>
            )}
          </div>
        </div>

        {/* Recurrence */}
        <div className="grid grid-cols-2 gap-2">
          <label className="block">
            <span className={labelClass}>Repeats</span>
            <select
              value={recurFreq}
              onChange={(e) => setRecurFreq(e.target.value as RecurrenceFreq | "")}
              className={fieldClass}
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
              <span className={labelClass}>Until (optional)</span>
              <input
                type="date"
                value={recurUntil}
                min={eventDate}
                onChange={(e) => setRecurUntil(e.target.value)}
                className={fieldClass}
              />
            </label>
          )}
        </div>

        {/* Per-event reminders */}
        <div>
          <span className={labelClass}>Reminders</span>
          <div className="mt-0.5 space-y-1.5 rounded-xl border border-line bg-canvas/40 p-2.5 text-sm">
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
                <span className="block text-xs text-muted">
                  7, 3, 1, and 0 days before — only if this event&apos;s label has &ldquo;Auto-remind&rdquo; on.
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
                <span className="block text-xs text-muted">No reminders for this event.</span>
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
                <span className="block text-xs text-muted">
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
                            "flex cursor-pointer items-center gap-1.5 rounded-lg border px-1.5 py-1 text-xs transition-colors " +
                            (checked
                              ? "border-brand bg-brand-soft text-brand"
                              : "border-line bg-surface text-ink/70 hover:bg-canvas")
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
          <label className="flex items-center gap-2 text-sm text-ink/80">
            <input
              type="checkbox"
              checked={completed}
              onChange={(e) => setCompleted(e.target.checked)}
              className="h-4 w-4 rounded border-line accent-brand"
            />
            Mark as done
          </label>
        )}

        <div className="flex items-center justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg px-3 py-1.5 text-sm text-ink/70 transition-colors hover:bg-canvas"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!title.trim() || (reminderMode === "custom" && customDays.length === 0)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3.5 py-1.5 text-sm font-semibold text-white shadow-soft transition-colors hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Save className="h-3.5 w-3.5" />
            {initial ? "Save" : "Add"}
          </button>
        </div>
      </div>
    </form>
  );
}
