"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { CalendarEvent } from "./types";
import { SEED_EVENTS } from "./seed";

const STORAGE_KEY = "yearly-calendar:events:v1";

function genId(): string {
  return `evt-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Owns the event list. Hydrates from localStorage on mount, persists on every
 * change. Returns events plus action helpers — components mutate via these
 * helpers, never by setting events directly.
 */
export function useEvents() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [hydrated, setHydrated] = useState(false);

  // Hydrate once on mount.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as CalendarEvent[];
        setEvents(Array.isArray(parsed) ? parsed : SEED_EVENTS);
      } else {
        setEvents(SEED_EVENTS);
      }
    } catch {
      setEvents(SEED_EVENTS);
    }
    setHydrated(true);
  }, []);

  // Persist on every change after hydration.
  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
    } catch {
      // Quota exceeded or storage unavailable — fail silently.
    }
  }, [events, hydrated]);

  const addEvent = useCallback((draft: Omit<CalendarEvent, "id">) => {
    setEvents((prev) => [...prev, { ...draft, id: genId() }]);
  }, []);

  const updateEvent = useCallback((id: string, updates: Partial<Omit<CalendarEvent, "id">>) => {
    setEvents((prev) => prev.map((e) => (e.id === id ? { ...e, ...updates } : e)));
  }, []);

  const deleteEvent = useCallback((id: string) => {
    setEvents((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const toggleComplete = useCallback((id: string) => {
    setEvents((prev) => prev.map((e) => (e.id === id ? { ...e, completed: !e.completed } : e)));
  }, []);

  /** Delete every event matching the predicate. Returns the count removed. */
  const deleteMany = useCallback((predicate: (e: CalendarEvent) => boolean) => {
    setEvents((prev) => prev.filter((e) => !predicate(e)));
  }, []);

  /** Wipe all events (still keeps the localStorage key, just sets it to []). */
  const deleteAll = useCallback(() => {
    setEvents([]);
  }, []);

  /** Replace the entire event list (used by backup restore in "replace" mode). */
  const replaceEvents = useCallback((next: CalendarEvent[]) => {
    setEvents(next);
  }, []);

  /** Merge incoming events into the current list. Events whose `id` already
   *  exists are overwritten; new ids are appended. */
  const mergeEvents = useCallback((incoming: CalendarEvent[]) => {
    setEvents((prev) => {
      const byId = new Map(prev.map((e) => [e.id, e]));
      for (const e of incoming) byId.set(e.id, e);
      return Array.from(byId.values());
    });
  }, []);

  const resetToSeed = useCallback(() => {
    setEvents(SEED_EVENTS);
  }, []);

  // Index by date for O(1) lookup in the calendar grid.
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
    updateEvent,
    deleteEvent,
    toggleComplete,
    deleteMany,
    deleteAll,
    replaceEvents,
    mergeEvents,
    resetToSeed,
  };
}
