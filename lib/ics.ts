// iCalendar (.ics / RFC 5545) generation + parsing.
//
// Export: each CalendarEvent becomes an all-day VEVENT so it drops onto the
// right day in Google/Apple Calendar. Recurring events use RRULE; reminder
// lead-times become VALARMs (DISPLAY triggers, which each calendar app routes to
// its own notification channels — including email, per the user's settings).
// Import: a minimal-but-robust parser that reads common VEVENTs/RRULEs back into
// our event drafts, degrading gracefully (single event) on anything exotic.
//
// Pure module — no Date.now()/imports of app state; callers pass timestamps in.

import type { CalendarEvent, Label, Recurrence, RecurrenceFreq } from "./types";
import { addDaysISO } from "./date-utils";
import { DEFAULT_LEAD_DAYS } from "./useReminders";

const PRODID = "-//Yearly Calendar//EN";

// ── helpers ─────────────────────────────────────────────────────────────────

/** YYYY-MM-DD → YYYYMMDD (iCal DATE value). */
function icsDate(iso: string): string {
  return iso.replace(/-/g, "");
}

/** ISO timestamp → iCal UTC DATE-TIME "YYYYMMDDTHHMMSSZ". Falls back safely. */
function icsStamp(isoTs: string): string {
  const m = isoTs.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})/);
  if (m) return `${m[1]}${m[2]}${m[3]}T${m[4]}${m[5]}${m[6]}Z`;
  // Fallback: date-only stamp at midnight.
  const d = isoTs.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return d ? `${d[1]}${d[2]}${d[3]}T000000Z` : "19700101T000000Z";
}

/** Escape text per RFC 5545 §3.3.11 (backslash, semicolon, comma, newline). */
function esc(s: string): string {
  return s
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

/** Fold a content line to 75 octets with CRLF + leading space continuation. */
function fold(line: string): string {
  if (line.length <= 75) return line;
  const parts: string[] = [];
  let rest = line;
  parts.push(rest.slice(0, 75));
  rest = rest.slice(75);
  while (rest.length > 74) {
    parts.push(" " + rest.slice(0, 74));
    rest = rest.slice(74);
  }
  if (rest.length) parts.push(" " + rest);
  return parts.join("\r\n");
}

/** Resolve the reminder lead-times for an event (mirrors useReminders). */
function resolveLeadTimes(event: CalendarEvent, getLabel: (id: string) => Label): number[] {
  if (event.reminderDays !== undefined) return event.reminderDays;
  return getLabel(event.category).remindByDefault ? DEFAULT_LEAD_DAYS : [];
}

/** Map our Recurrence to an RRULE value (without the "RRULE:" prefix). */
function toRRule(rec: Recurrence): string {
  const parts: string[] = [];
  switch (rec.freq) {
    case "WEEKLY": parts.push("FREQ=WEEKLY"); break;
    case "MONTHLY": parts.push("FREQ=MONTHLY"); break;
    case "YEARLY": parts.push("FREQ=YEARLY"); break;
    case "SEMESTER": parts.push("FREQ=MONTHLY", "INTERVAL=6"); break;
  }
  if (rec.until) parts.push(`UNTIL=${icsDate(rec.until)}`);
  return parts.join(";");
}

// ── export ──────────────────────────────────────────────────────────────────

/**
 * Serialize events to a VCALENDAR string. `stampISO` is the DTSTAMP (an ISO
 * timestamp string, injected so this stays pure). `includeAlarms` toggles
 * VALARMs (default true).
 */
export function eventsToICS(
  events: CalendarEvent[],
  getLabel: (id: string) => Label,
  stampISO: string,
  includeAlarms = true
): string {
  // ISO "2026-07-08T13:04:05.678Z" → iCal UTC "20260708T130405Z".
  const dtstamp = icsStamp(stampISO);
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:${PRODID}`,
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
  ];

  for (const e of events) {
    const label = getLabel(e.category);
    const descParts: string[] = [];
    if (e.description) descParts.push(e.description);
    if (e.links?.length) descParts.push(e.links.map((l) => `${l.label}: ${l.url}`).join("\n"));
    const description = descParts.join("\n\n");

    lines.push("BEGIN:VEVENT");
    lines.push(`UID:${esc(e.id)}@yearly-calendar`);
    lines.push(`DTSTAMP:${dtstamp}`);
    // All-day: DATE value; DTEND is exclusive so add one day.
    lines.push(`DTSTART;VALUE=DATE:${icsDate(e.date)}`);
    lines.push(`DTEND;VALUE=DATE:${icsDate(addDaysISO(e.date, 1))}`);
    lines.push(`SUMMARY:${esc(e.title)}`);
    if (description) lines.push(`DESCRIPTION:${esc(description)}`);
    if (e.links?.[0]?.url) lines.push(`URL:${esc(e.links[0].url)}`);
    lines.push(`CATEGORIES:${esc(label.label)}`);
    if (e.recurrence) lines.push(`RRULE:${toRRule(e.recurrence)}`);

    if (includeAlarms) {
      for (const d of resolveLeadTimes(e, getLabel)) {
        const trigger = d === 0 ? "TRIGGER:PT0S" : `TRIGGER:-P${d}D`;
        lines.push("BEGIN:VALARM");
        lines.push("ACTION:DISPLAY");
        lines.push(`DESCRIPTION:${esc(e.title)}`);
        lines.push(trigger);
        lines.push("END:VALARM");
      }
    }
    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");
  return lines.map(fold).join("\r\n") + "\r\n";
}

// ── import ──────────────────────────────────────────────────────────────────

/** A parsed event draft (no id/category/updatedAt — the UI assigns those). */
export interface ParsedEvent {
  title: string;
  date: string; // YYYY-MM-DD
  description?: string;
  url?: string;
  recurrence?: Recurrence;
}

/** Unescape RFC 5545 text. */
function unesc(s: string): string {
  return s
    .replace(/\\n/gi, "\n")
    .replace(/\\,/g, ",")
    .replace(/\\;/g, ";")
    .replace(/\\\\/g, "\\");
}

/** Unfold folded lines (a CRLF followed by space/tab continues the prior line). */
function unfold(text: string): string[] {
  const raw = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  const out: string[] = [];
  for (const line of raw) {
    if ((line.startsWith(" ") || line.startsWith("\t")) && out.length) {
      out[out.length - 1] += line.slice(1);
    } else {
      out.push(line);
    }
  }
  return out;
}

/** Parse an iCal DTSTART value (DATE or DATE-TIME) to YYYY-MM-DD (local date). */
function parseDtStart(value: string): string | null {
  const v = value.trim();
  // DATE: 20260708 ; DATE-TIME: 20260708T130000Z / ...T130000
  const m = v.match(/^(\d{4})(\d{2})(\d{2})/);
  if (!m) return null;
  return `${m[1]}-${m[2]}-${m[3]}`;
}

/** Map an RRULE value back to our Recurrence, if it's one we support. */
function parseRRule(value: string): Recurrence | undefined {
  const map = new Map<string, string>();
  for (const kv of value.split(";")) {
    const [k, val] = kv.split("=");
    if (k && val) map.set(k.toUpperCase(), val.toUpperCase());
  }
  const freq = map.get("FREQ");
  const interval = Number(map.get("INTERVAL") || "1");
  let recFreq: RecurrenceFreq | null = null;
  if (freq === "WEEKLY" && interval === 1) recFreq = "WEEKLY";
  else if (freq === "MONTHLY" && interval === 6) recFreq = "SEMESTER";
  else if (freq === "MONTHLY" && interval === 1) recFreq = "MONTHLY";
  else if (freq === "YEARLY" && interval === 1) recFreq = "YEARLY";
  if (!recFreq) return undefined; // unsupported cadence → treat as single event
  const until = map.get("UNTIL");
  const untilISO = until && /^\d{8}/.test(until) ? `${until.slice(0, 4)}-${until.slice(4, 6)}-${until.slice(6, 8)}` : undefined;
  return { freq: recFreq, until: untilISO };
}

/** Split "PROP;PARAMS:VALUE" into name (upper), and value. */
function splitLine(line: string): { name: string; value: string } | null {
  const idx = line.indexOf(":");
  if (idx < 0) return null;
  const left = line.slice(0, idx);
  const value = line.slice(idx + 1);
  const name = left.split(";")[0].toUpperCase();
  return { name, value };
}

/**
 * Parse a .ics file's VEVENTs into event drafts. Unsupported properties are
 * ignored; unsupported RRULEs degrade to a single (non-recurring) event.
 */
export function parseICS(text: string): ParsedEvent[] {
  const lines = unfold(text);
  const events: ParsedEvent[] = [];
  let cur: Partial<ParsedEvent> | null = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed === "BEGIN:VEVENT") {
      cur = {};
      continue;
    }
    if (trimmed === "END:VEVENT") {
      if (cur && cur.title && cur.date) {
        events.push({
          title: cur.title,
          date: cur.date,
          description: cur.description,
          url: cur.url,
          recurrence: cur.recurrence,
        });
      }
      cur = null;
      continue;
    }
    if (!cur) continue;

    const parsed = splitLine(line);
    if (!parsed) continue;
    const { name, value } = parsed;
    switch (name) {
      case "SUMMARY":
        cur.title = unesc(value).trim();
        break;
      case "DESCRIPTION":
        cur.description = unesc(value).trim() || undefined;
        break;
      case "URL":
        cur.url = value.trim() || undefined;
        break;
      case "DTSTART": {
        const d = parseDtStart(value);
        if (d) cur.date = d;
        break;
      }
      case "RRULE":
        cur.recurrence = parseRRule(value);
        break;
    }
  }
  return events;
}
