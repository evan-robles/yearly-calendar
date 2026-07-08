// Expand recurring events into concrete dated occurrences for a visible range.
//
// Storage model: a recurring event is stored ONCE (its `date` is the first
// occurrence, `recurrence` holds the rule). We never persist the expansion —
// occurrences are computed on demand for whatever date window is being rendered
// or swept for reminders. This keeps localStorage/gist small and lets the series
// extend indefinitely.

import type { CalendarEvent } from "./types";
import { addDaysISO, addMonthsISO, addYearsISO } from "./date-utils";

/** A single materialised instance of an event on a specific date. */
export interface Occurrence {
  /** The parent event (the stored series or one-off). */
  event: CalendarEvent;
  /** The YYYY-MM-DD this occurrence falls on. */
  date: string;
  /** True when this is the very first occurrence (== event.date). */
  isFirst: boolean;
  /** Whether THIS occurrence is done (per-occurrence for series, base flag otherwise). */
  completed: boolean;
}

/** Step a recurring date forward by one period. */
function stepDate(iso: string, event: CalendarEvent): string {
  switch (event.recurrence!.freq) {
    case "WEEKLY":
      return addDaysISO(iso, 7);
    case "MONTHLY":
      return addMonthsISO(iso, 1);
    case "SEMESTER":
      return addMonthsISO(iso, 6);
    case "YEARLY":
      return addYearsISO(iso, 1);
  }
}

/** Is a given occurrence date marked done? */
function occurrenceDone(event: CalendarEvent, date: string): boolean {
  if (!event.recurrence) return event.completed;
  // Recurring: per-occurrence completion tracked in completedDates.
  return event.completedDates?.includes(date) ?? false;
}

/**
 * Expand one event into its occurrences intersecting [rangeStart, rangeEnd]
 * (inclusive, YYYY-MM-DD). A non-recurring event yields at most one occurrence.
 * A hard cap prevents pathological loops.
 */
export function expandEvent(event: CalendarEvent, rangeStart: string, rangeEnd: string): Occurrence[] {
  if (!event.recurrence) {
    if (event.date < rangeStart || event.date > rangeEnd) return [];
    return [{ event, date: event.date, isFirst: true, completed: event.completed }];
  }

  const out: Occurrence[] = [];
  const hardEnd = event.recurrence.until && event.recurrence.until < rangeEnd ? event.recurrence.until : rangeEnd;
  let cursor = event.date;
  let isFirst = true;
  let guard = 0;
  const MAX = 5000; // ~96 years weekly; well beyond any real view window.

  // Fast-forward is implicit: we start at the first occurrence and step until we
  // pass the window end (or the series' `until`).
  while (cursor <= hardEnd && guard < MAX) {
    if (cursor >= rangeStart) {
      out.push({ event, date: cursor, isFirst, completed: occurrenceDone(event, cursor) });
    }
    cursor = stepDate(cursor, event);
    isFirst = false;
    guard++;
  }
  return out;
}

/**
 * Expand a whole event list across [rangeStart, rangeEnd] into a
 * date → occurrences map, suitable for the calendar grid.
 */
export function expandToMap(
  events: CalendarEvent[],
  rangeStart: string,
  rangeEnd: string
): Map<string, Occurrence[]> {
  const map = new Map<string, Occurrence[]>();
  for (const event of events) {
    for (const occ of expandEvent(event, rangeStart, rangeEnd)) {
      const list = map.get(occ.date);
      if (list) list.push(occ);
      else map.set(occ.date, [occ]);
    }
  }
  return map;
}
