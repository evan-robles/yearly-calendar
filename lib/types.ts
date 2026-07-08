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

export interface CalendarEvent {
  id: string;
  /** ISO date YYYY-MM-DD. */
  date: string;
  category: CategoryId;
  title: string;
  description?: string;
  completed: boolean;
  /** Per-event reminder override.
   *  - `undefined` → use the global defaults (7, 3, 1, 0 days, only for time-
   *    sensitive categories).
   *  - `[]` → never fire reminders for this event.
   *  - `[14, 3]` → fire reminders 14 and 3 days before, regardless of category. */
  reminderDays?: number[];
}
