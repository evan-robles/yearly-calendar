// Pure date utilities. All "dates" stored as YYYY-MM-DD strings; all in-memory
// math uses local Date so the calendar reflects the user's timezone.

export const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export const DAY_HEADERS_MON_FIRST = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** Format a Date as YYYY-MM-DD in local time (avoids the toISOString UTC trap). */
export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Build a YYYY-MM-DD string for a given (year, monthIndex, day) without TZ drift. */
export function buildISODate(year: number, monthIndex0: number, day: number): string {
  return toISODate(new Date(year, monthIndex0, day));
}

/** Today, as YYYY-MM-DD in local time. */
export function todayISO(): string {
  return toISODate(new Date());
}

/**
 * Returns a 6-row × 7-col grid for the given month, Monday-first.
 * Cells outside the month are 0; in-month cells are the day of month.
 * Some months fit in 5 rows; we still return 6 rows (last row may be all 0s
 * and we trim it in the renderer) for shape consistency.
 */
export function monthGrid(year: number, monthIndex0: number): number[][] {
  const firstOfMonth = new Date(year, monthIndex0, 1);
  // JS getDay(): 0=Sun..6=Sat. Convert to Mon-first: Mon=0..Sun=6.
  const jsDow = firstOfMonth.getDay();
  const offsetMonFirst = (jsDow + 6) % 7;
  const daysInMonth = new Date(year, monthIndex0 + 1, 0).getDate();

  const cells: number[] = [];
  for (let i = 0; i < offsetMonFirst; i++) cells.push(0);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(0);

  // Trim trailing all-zero rows.
  const rows: number[][] = [];
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));
  while (rows.length > 0 && rows[rows.length - 1].every((c) => c === 0)) rows.pop();
  return rows;
}

/** A nicely formatted date for display, e.g. "Friday, May 8, 2026". */
export function formatLong(isoDate: string): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

// ──────────────────────────────────────────────────────────────────────────
// Range helpers (used by bulk delete). All return ISO YYYY-MM-DD strings,
// inclusive of both endpoints.
// ──────────────────────────────────────────────────────────────────────────

/** Monday of the week containing `iso`. */
export function startOfWeekISO(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const jsDow = date.getDay(); // 0=Sun..6=Sat
  const offsetMonFirst = (jsDow + 6) % 7; // Mon=0..Sun=6
  date.setDate(date.getDate() - offsetMonFirst);
  return toISODate(date);
}

/** Sunday of the week containing `iso`. */
export function endOfWeekISO(iso: string): string {
  const [y, m, d] = startOfWeekISO(iso).split("-").map(Number);
  const date = new Date(y, m - 1, d + 6);
  return toISODate(date);
}

export function startOfMonthISO(year: number, monthIndex0: number): string {
  return buildISODate(year, monthIndex0, 1);
}

export function endOfMonthISO(year: number, monthIndex0: number): string {
  const lastDay = new Date(year, monthIndex0 + 1, 0).getDate();
  return buildISODate(year, monthIndex0, lastDay);
}

export function startOfYearISO(year: number): string {
  return `${year}-01-01`;
}

export function endOfYearISO(year: number): string {
  return `${year}-12-31`;
}
