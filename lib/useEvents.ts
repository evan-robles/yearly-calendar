"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { CalendarEvent } from "./types";
import { SEED_EVENTS } from "./seed";
import { migrate, wrapPayload } from "./migrate";

const STORAGE_KEY = "yearly-calendar:events:v1";

function nowISO(): string {
  return new Date().toISOString();
}

function genId(): string {
  return `evt-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Ensure a value has schema-v2 required fields (used for seed data too). */
function withStamp(e: Omit<CalendarEvent, "updatedAt"> & { updatedAt?: string }): CalendarEvent {
  return { ...e, updatedAt: e.updatedAt ?? nowISO() };
}

/**
 * Owns the event list. Hydrates from localStorage (through the versioned
 * migration) on mount, persists on every change as a `{version,events}` payload.
 * Every mutation stamps `updatedAt` so cross-device sync can merge newest-wins.
 * Components mutate via these helpers, never by setting events directly.
 */
export function useEvents() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [hydrated, setHydrated] = useState(false);

  // Hydrate once on mount, through migrate().
  useEffect(() => {
    const migrated = migrate(localStorage.getItem(STORAGE_KEY), nowISO());
    setEvents(migrated ?? SEED_EVENTS.map(withStamp));
    setHydrated(true);
  }, []);

  // Persist on every change after hydration, in the versioned wrapper shape.
  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(wrapPayload(events)));
    } catch {
      // Quota exceeded or storage unavailable — fail silently.
    }
  }, [events, hydrated]);

  const addEvent = useCallback((draft: Omit<CalendarEvent, "id" | "updatedAt">) => {
    setEvents((prev) => [...prev, { ...draft, id: genId(), updatedAt: nowISO() }]);
  }, []);

  /** Bulk-add drafts (e.g. from .ics import) in a single state update. */
  const addMany = useCallback((drafts: Omit<CalendarEvent, "id" | "updatedAt">[]) => {
    const stamp = nowISO();
    setEvents((prev) => [
      ...prev,
      ...drafts.map((d) => ({ ...d, id: genId(), updatedAt: stamp })),
    ]);
  }, []);

  const updateEvent = useCallback((id: string, updates: Partial<Omit<CalendarEvent, "id">>) => {
    setEvents((prev) => prev.map((e) => (e.id === id ? { ...e, ...updates, updatedAt: nowISO() } : e)));
  }, []);

  const deleteEvent = useCallback((id: string) => {
    setEvents((prev) => prev.filter((e) => e.id !== id));
  }, []);

  /** Toggle done for a NON-recurring event (or the base flag of any event). */
  const toggleComplete = useCallback((id: string) => {
    setEvents((prev) =>
      prev.map((e) => (e.id === id ? { ...e, completed: !e.completed, updatedAt: nowISO() } : e))
    );
  }, []);

  /** Toggle done for ONE occurrence of a recurring series (keyed by date). For a
   *  non-recurring event this falls back to the base `completed` flag. */
  const toggleOccurrenceComplete = useCallback((id: string, date: string) => {
    setEvents((prev) =>
      prev.map((e) => {
        if (e.id !== id) return e;
        if (!e.recurrence) return { ...e, completed: !e.completed, updatedAt: nowISO() };
        const set = new Set(e.completedDates ?? []);
        if (set.has(date)) set.delete(date);
        else set.add(date);
        const next = Array.from(set);
        return { ...e, completedDates: next.length ? next : undefined, updatedAt: nowISO() };
      })
    );
  }, []);

  /** Delete every event matching the predicate. Returns the count removed. */
  const deleteMany = useCallback((predicate: (e: CalendarEvent) => boolean) => {
    setEvents((prev) => prev.filter((e) => !predicate(e)));
  }, []);

  /** Wipe all events. */
  const deleteAll = useCallback(() => {
    setEvents([]);
  }, []);

  /** Replace the entire event list (used by backup restore in "replace" mode). */
  const replaceEvents = useCallback((next: CalendarEvent[]) => {
    setEvents(next.map(withStamp));
  }, []);

  /** Merge incoming events into the current list. Events whose `id` already
   *  exists are overwritten; new ids are appended. (Used by backup "merge".) */
  const mergeEvents = useCallback((incoming: CalendarEvent[]) => {
    setEvents((prev) => {
      const byId = new Map(prev.map((e) => [e.id, e]));
      for (const e of incoming) byId.set(e.id, withStamp(e));
      return Array.from(byId.values());
    });
  }, []);

  /** Merge incoming events, keeping whichever side has the later `updatedAt` for
   *  a shared id (newest-wins). Used by gist sync reconcile. Returns the merged
   *  list so callers can also push it upstream. */
  const mergeNewestWins = useCallback((incoming: CalendarEvent[]): CalendarEvent[] => {
    let merged: CalendarEvent[] = [];
    setEvents((prev) => {
      const byId = new Map(prev.map((e) => [e.id, e]));
      for (const inc of incoming) {
        const stamped = withStamp(inc);
        const cur = byId.get(stamped.id);
        if (!cur || Date.parse(stamped.updatedAt) >= Date.parse(cur.updatedAt)) {
          byId.set(stamped.id, stamped);
        }
      }
      merged = Array.from(byId.values());
      return merged;
    });
    return merged;
  }, []);

  const resetToSeed = useCallback(() => {
    setEvents(SEED_EVENTS.map((e) => withStamp({ ...e, updatedAt: nowISO() })));
  }, []);

  // Index by date for O(1) lookup (base events only; recurrence expansion is
  // done at render time in the page via lib/recurrence).
  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const e of events) {
      const list = map.get(e.date);
      if (list) list.push(e);
      else map.set(e.date, [e]);
    }
    return map;
  }, [events]);

  return {
    events,
    eventsByDate,
    hydrated,
    addEvent,
    addMany,
    updateEvent,
    deleteEvent,
    toggleComplete,
    toggleOccurrenceComplete,
    deleteMany,
    deleteAll,
    replaceEvents,
    mergeEvents,
    mergeNewestWins,
    resetToSeed,
  };
}
