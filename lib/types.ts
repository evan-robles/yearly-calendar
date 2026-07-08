// Single source of truth for event/category types.

export type CategoryId =
  | "DEADLINE"
  | "MILESTONE"
  | "UCHICAGO"
  | "FELLOWSHIP"
  | "OPENS"
  | "RESEARCH"
  | "ACADEMIC"
  | "REMINDER";

export interface CategoryMeta {
  id: CategoryId;
  label: string;
  /** Background fill for cells/chips (light tint). */
  bg: string;
  /** Text/border accent (darker shade of bg). */
  accent: string;
  /** Lower number = higher priority. Used to pick the day-cell color when a
   * single day has multiple events. */
  priority: number;
}

export const CATEGORIES: Record<CategoryId, CategoryMeta> = {
  DEADLINE:   { id: "DEADLINE",   label: "Deadline",          bg: "#FFC7CE", accent: "#C0392B", priority: 1 },
  MILESTONE:  { id: "MILESTONE",  label: "Milestone",         bg: "#F4B084", accent: "#A04500", priority: 2 },
  UCHICAGO:   { id: "UCHICAGO",   label: "UChicago internal", bg: "#FFD966", accent: "#8A6D00", priority: 3 },
  FELLOWSHIP: { id: "FELLOWSHIP", label: "Fellowship",        bg: "#D5A6BD", accent: "#7A2E55", priority: 4 },
  OPENS:      { id: "OPENS",      label: "Application opens", bg: "#BDD7EE", accent: "#1F4E79", priority: 5 },
  RESEARCH:   { id: "RESEARCH",   label: "Research",          bg: "#C6EFCE", accent: "#1E6B3A", priority: 6 },
  ACADEMIC:   { id: "ACADEMIC",   label: "Academic",          bg: "#D9D9D9", accent: "#404040", priority: 7 },
  REMINDER:   { id: "REMINDER",   label: "Reminder",          bg: "#FFF2CC", accent: "#806600", priority: 8 },
};

export const CATEGORY_LIST: CategoryMeta[] = Object.values(CATEGORIES).sort(
  (a, b) => a.priority - b.priority
);

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
