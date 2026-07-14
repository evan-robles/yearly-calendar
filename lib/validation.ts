// Single source of truth for validating / coercing CalendarEvent data coming
// from any untrusted origin: localStorage, an imported backup file, or a synced
// gist. Keeping this in one place means the same rules apply everywhere and a
// malformed payload fails loudly (or is repaired predictably) instead of quietly
// corrupting app state.

import { type CalendarEvent, type CategoryId, type EventLink, type Label, type Recurrence, type RecurrenceFreq } from "./types";

const VALID_FREQS = new Set<RecurrenceFreq>(["WEEKLY", "MONTHLY", "YEARLY", "SEMESTER"]);
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const HEX_COLOR = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

export function isISODate(v: unknown): v is string {
  return typeof v === "string" && ISO_DATE.test(v);
}

/** Coerce a value to a hex color, or return the fallback if it isn't one. */
function coerceHex(v: unknown, fallback: string): string {
  return typeof v === "string" && HEX_COLOR.test(v.trim()) ? v.trim() : fallback;
}

/**
 * Validate & coerce a raw labels array. Labels are user data (from localStorage
 * or a synced gist), so bad entries are repaired (colors) or dropped (missing
 * id/name) rather than throwing — a malformed label set must never brick the app.
 */
export function validateLabels(raw: unknown): Label[] {
  if (!Array.isArray(raw)) return [];
  const out: Label[] = [];
  let autoPriority = 1;
  for (const item of raw as unknown[]) {
    if (!item || typeof item !== "object") continue;
    const l = item as Partial<Label>;
    const id = typeof l.id === "string" && l.id ? l.id : null;
    const name = typeof l.label === "string" && l.label.trim() ? l.label.trim() : null;
    if (!id || !name) continue;
    out.push({
      id,
      label: name,
      bg: coerceHex(l.bg, "#E5E7EB"),
      accent: coerceHex(l.accent, "#6B7280"),
      priority: typeof l.priority === "number" && Number.isFinite(l.priority) ? l.priority : autoPriority,
      remindByDefault: Boolean(l.remindByDefault),
    });
    autoPriority++;
  }
  return out;
}

/**
 * Normalize a user/imported URL: trim, and if it has no scheme, assume https.
 * Allows http(s) and file:// links; rejects anything else (returns null) so we
 * never render a `javascript:` or otherwise unsafe href.
 *
 * Note on file:// — a local-file link (e.g. file:///Users/you/doc.pdf) is
 * accepted so the calendar can open a file when it is itself opened from a
 * local/localhost origin. Browsers block navigating to file:// from an https
 * page, so on the deployed (https) site clicking such a link may do nothing;
 * the UI surfaces this caveat where these links are entered/shown.
 */
export function normalizeUrl(raw: string): string | null {
  const s = raw.trim();
  if (!s) return null;
  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(s) ? s : `https://${s}`;
  try {
    const u = new URL(withScheme);
    if (u.protocol !== "http:" && u.protocol !== "https:" && u.protocol !== "file:") return null;
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
    const u = new URL(url);
    // file:// URLs have no hostname — label them with the file name instead.
    if (u.protocol === "file:") {
      const name = decodeURIComponent(u.pathname.split("/").filter(Boolean).pop() || "");
      return name || "Local file";
    }
    return u.hostname.replace(/^www\./, "");
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
  // `category` is a label id — any non-empty string. An id with no matching label
  // renders via the UNKNOWN_LABEL fallback (see useLabels.getLabel); we tolerate
  // it here rather than reject, so deleting a label never invalidates its events.
  // An empty/missing category is coerced to the fallback id.
  const category: CategoryId = typeof e.category === "string" && e.category ? e.category : "__unknown__";

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
    category,
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
