// Single source of truth for validating / coercing CalendarEvent data coming
// from any untrusted origin: localStorage, an imported backup file, or a synced
// gist. Keeping this in one place means the same rules apply everywhere and a
// malformed payload fails loudly (or is repaired predictably) instead of quietly
// corrupting app state.

import { CATEGORIES, type CalendarEvent, type CategoryId, type EventLink, type Recurrence, type RecurrenceFreq } from "./types";

const VALID_CATS = new Set(Object.keys(CATEGORIES));
const VALID_FREQS = new Set<RecurrenceFreq>(["WEEKLY", "MONTHLY", "YEARLY", "SEMESTER"]);
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function isISODate(v: unknown): v is string {
  return typeof v === "string" && ISO_DATE.test(v);
}

/**
 * Normalize a user/imported URL: trim, and if it has no scheme, assume https.
 * Rejects anything that can't be parsed as an http(s) URL (returns null) so we
 * never render a `javascript:` or otherwise unsafe href.
 */
export function normalizeUrl(raw: string): string | null {
  const s = raw.trim();
  if (!s) return null;
  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(s) ? s : `https://${s}`;
  try {
    const u = new URL(withScheme);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    return u.toString();
  } catch {
    return null;
  }
}

function coerceLinks(raw: unknown): EventLink[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const out: EventLink[] = [];
  for (const item of raw as unknown[]) {
    if (!item || typeof item !== "object") continue;
    const l = item as Partial<EventLink>;
    if (typeof l.url !== "string") continue;
    const url = normalizeUrl(l.url);
    if (!url) continue;
    const label = typeof l.label === "string" && l.label.trim() ? l.label.trim() : hostLabel(url);
    out.push({ label, url });
  }
  return out.length > 0 ? out : undefined;
}

/** A short human label derived from a URL's host (fallback when none given). */
export function hostLabel(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "Link";
  }
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
    links: coerceLinks(e.links),
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
