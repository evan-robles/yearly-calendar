// Versioned migration for the persisted event store.
//
// History of the storage payload under STORAGE_KEY:
//   pre-v1 : a bare JSON array of events (earliest builds)
//   v1     : still a bare array (the app read/wrote `CalendarEvent[]` directly)
//   v2     : a wrapper `{ version: 2, events: CalendarEvent[] }`, where every
//            event carries `updatedAt` (added for newest-wins sync) and may
//            carry `recurrence` / `completedDates`.
//   v3     : the SYNC/gist payload also carries user labels:
//            `{ version: 3, events, labels, labelsUpdatedAt }`. Locally, labels
//            live under their own key (see useLabels); this wrapper is what the
//            gist stores so a second device gets both events and labels.
//
// `migrate` accepts whatever is on disk and returns a clean, current-schema
// event list. It never throws — on any unrecoverable problem it returns null so
// the caller can fall back to the seed data.

import type { CalendarEvent } from "./types";
import { validateEvents } from "./validation";

export const STORAGE_VERSION = 3;

export interface StorePayload {
  version: number;
  events: CalendarEvent[];
}

/** Wrap a current-schema event list into the persisted (events) payload shape. */
export function wrapPayload(events: CalendarEvent[]): StorePayload {
  return { version: STORAGE_VERSION, events };
}

/**
 * Parse + migrate a raw localStorage string to a current-schema event list.
 * Returns null if the string is absent/empty/unparseable/invalid so the caller
 * can seed instead. `nowISO` is injected (not read from Date here) so callers
 * control the backfill timestamp.
 */
export function migrate(raw: string | null, nowISO: string): CalendarEvent[] | null {
  if (!raw) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  try {
    // Both the bare-array (pre-v2) and wrapper (v2) shapes are understood by
    // validateEvents, which also backfills updatedAt for pre-v2 events.
    const events = validateEvents(parsed, nowISO);
    return events;
  } catch {
    return null;
  }
}
