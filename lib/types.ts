// Single source of truth for event/label types.
//
// Labels (formerly the fixed "categories") are now USER-MANAGED data: created,
// recolored, reordered, and deleted at runtime and persisted/synced like events.
// An event's `category` field holds a label id (an arbitrary string). Because a
// referenced label may be deleted, all rendering goes through a safe lookup
// (see lib/useLabels.ts `getLabel`) that falls back to a neutral label rather
// than crashing.

/** A label id is just a string (the label's stable id). Kept named `CategoryId`
 *  to avoid churn across the codebase where events use `category`. */
export type CategoryId = string;
export type LabelId = string;

/** A user-managed label: name + colors + ordering + reminder default. */
export interface Label {
  id: LabelId;
  label: string;
  /** Background fill for cells/chips (light tint), hex. */
  bg: string;
  /** Text/border accent (darker shade), hex. */
  accent: string;
  /** Lower number = higher priority; picks the day-cell color when a day has
   *  multiple events, and orders the label lists. */
  priority: number;
  /** When true, events with this label get the default reminder schedule
   *  ([7,3,1,0] days) even without a per-event override. Replaces the old
   *  hardcoded DEADLINE/MILESTONE/UCHICAGO default set. */
  remindByDefault: boolean;
}

/** Back-compat alias: older code referred to labels as `CategoryMeta`. */
export type CategoryMeta = Label;

/** No seed labels — a fresh install starts empty and the user creates their own
 *  labels via the Labels manager. */
export const DEFAULT_LABELS: Label[] = [];

/** Neutral fallback for an event referencing a deleted/unknown label. */
export const UNKNOWN_LABEL: Label = {
  id: "__unknown__",
  label: "Unlabeled",
  bg: "#E5E7EB",
  accent: "#6B7280",
  priority: 999,
  remindByDefault: false,
};

/** How an event repeats. `freq` is the cadence; `until` (inclusive, YYYY-MM-DD)
 *  optionally caps the series. `SEMESTER` = every 6 months from the base date. */
export type RecurrenceFreq = "WEEKLY" | "MONTHLY" | "YEARLY" | "SEMESTER";

export interface Recurrence {
  freq: RecurrenceFreq;
  /** Inclusive last date the series may produce an occurrence (YYYY-MM-DD). */
  until?: string;
}

/** A named hyperlink attached to an event (e.g. an application portal, a Zoom
 *  link, an instructions page). */
export interface EventLink {
  label: string;
  url: string;
}

export interface CalendarEvent {
  id: string;
  /** ISO date YYYY-MM-DD. For a recurring event this is the FIRST occurrence. */
  date: string;
  category: CategoryId;
  title: string;
  description?: string;
  completed: boolean;
  /** Optional named hyperlinks. */
  links?: EventLink[];
  /** Per-event reminder override.
   *  - `undefined` → use the global defaults (7, 3, 1, 0 days, only for time-
   *    sensitive categories).
   *  - `[]` → never fire reminders for this event.
   *  - `[14, 3]` → fire reminders 14 and 3 days before, regardless of category. */
  reminderDays?: number[];
  /** ISO timestamp of the last edit. Drives newest-wins merge during sync.
   *  Always present from schema v2 onward; migration backfills it. */
  updatedAt: string;
  /** Optional repeat rule. When set, `date` is the first occurrence and further
   *  occurrences are expanded at render time (see lib/recurrence.ts). */
  recurrence?: Recurrence;
  /** For a recurring series: ISO dates of occurrences the user marked done.
   *  The base event's own `completed` flag governs the FIRST occurrence only
   *  when there's no recurrence; with a recurrence, per-occurrence completion
   *  lives here (keyed by the occurrence's YYYY-MM-DD). */
  completedDates?: string[];
}

export const RECURRENCE_LABELS: Record<RecurrenceFreq, string> = {
  WEEKLY: "Weekly",
  MONTHLY: "Monthly",
  SEMESTER: "Every semester (6 mo)",
  YEARLY: "Yearly",
};
