import type { CalendarEvent } from "./types";

/** Seed events omit `updatedAt` (it's stamped at load time by useEvents via
 *  `withStamp`), so they're typed as CalendarEvent minus that field. */
export type SeedEvent = Omit<CalendarEvent, "updatedAt">;

/**
 * No seed events — a fresh install starts empty. Users create their own labels
 * (see DEFAULT_LABELS in types.ts) and events. The Reset button clears back to
 * this empty state.
 */
export const SEED_EVENTS: SeedEvent[] = [];
