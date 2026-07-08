// Single source of truth for validating / coercing CalendarEvent data coming
// from any untrusted origin: localStorage, an imported backup file, or a synced
// gist. Keeping this in one place means the same rules apply everywhere and a
// malformed payload fails loudly (or is repaired predictably) instead of quietly
// corrupting app state.

import { CATEGORIES, type CalendarEvent, type CategoryId, type Recurrence, type RecurrenceFreq } from "./types";

const VALID_CATS = new Set(Object.keys(CATEGORIES));
const VALID_FREQS = new Set<RecurrenceFreq>(["WEEKLY", "MONTHLY", "YEARLY", "SEMESTER"]);
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function isISODate(v: unknown): v is string {
  return typeof v === "string" && ISO_DATE.test(v);
}

function coerceRecurrence(raw: unknown): Recurrence | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const r = raw as Partial<Recurrence>;
  if (typeof r.freq !== "string" || !VALID_FREQS.has(r.freq as RecurrenceFreq)) {
    return undefined; // unknown/absent freq → treat as non-recurring
  }
  const until = isISODate(r.until) ? r.until : undefined;
  return { freq: r.freq as RecurrenceFreq, until };
}

/**
 * Validate & coerce a single raw object into a CalendarEvent. Throws with a
 * human-readable message (including the index, when given) if a required field
 * is missing or malformed. Optional/soft fields are repaired rather than
 * rejected (e.g. missing `updatedAt` is backfilled to `nowISO`).
 */
export function coerceEvent(raw: unknown, index: number, nowISO: string): CalendarEvent {
  const where = `Event ${index}`;
  if (!raw || typeof raw !== "object") throw new Error(`${where} is not an object.`);
  const e = raw as Partial<CalendarEvent> & Record<string, unknown>;

  if (typeof e.id !== "string" || !e.id) throw new Error(`${where}: missing 'id'.`);
  if (!isISODate(e.date)) throw new Error(`${where} (${e.id}): invalid 'date' (expected YYYY-MM-DD).`);
  if (typeof e.title !== "string" || !e.title) throw new Error(`${where} (${e.id}): missing 'title'.`);
  if (typeof e.category !== "string" || !VALID_CATS.has(e.category)) {
    throw new Error(`${where} (${e.id}): unknown category '${String(e.category)}'.`);
  }

  const reminderDays = Array.isArray(e.reminderDays)
    ? (e.reminderDays as unknown[]).filter((d): d is number => typeof d === "number" && d >= 0)
    : undefined;

  const completedDates = Array.isArray(e.completedDates)
    ? (e.completedDates as unknown[]).filter(isISODate)
    : undefined;

  return {
    id: e.id,
    date: e.date,
    title: e.title,
    category: e.category as CategoryId,
    description: typeof e.description === "string" ? e.description : undefined,
    completed: Boolean(e.completed),
    reminderDays,
    updatedAt: isISOTimestamp(e.updatedAt) ? (e.updatedAt as string) : nowISO,
    recurrence: coerceRecurrence(e.recurrence),
    completedDates: completedDates && completedDates.length > 0 ? completedDates : undefined,
  };
}

function isISOTimestamp(v: unknown): boolean {
  return typeof v === "string" && !Number.isNaN(Date.parse(v));
}

/**
 * Validate & coerce a list of raw events. Accepts either a bare array or a
 * wrapper object exposing an `events` array (our backup/gist format).
 */
export function validateEvents(obj: unknown, nowISO: string): CalendarEvent[] {
  let rawEvents: unknown;
  if (Array.isArray(obj)) {
    rawEvents = obj;
  } else if (obj && typeof obj === "object" && Array.isArray((obj as { events?: unknown }).events)) {
    rawEvents = (obj as { events: unknown[] }).events;
  } else {
    throw new Error("Payload doesn't look like calendar data — expected an events array or an object with an 'events' array.");
  }
  const arr = rawEvents as unknown[];
  return arr.map((e, i) => coerceEvent(e, i, nowISO));
}
