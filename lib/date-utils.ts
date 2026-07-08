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

/**
 * Whole-day difference (b − a) between two YYYY-MM-DD strings.
 *
 * Uses Date.UTC so the arithmetic is anchored to UTC midnight and cannot be
 * perturbed by a daylight-saving-time transition between the two dates (a
 * local-time subtraction can land on 23h or 25h and, after rounding, shift the
 * day count by one near DST boundaries). Since we only compare calendar dates,
 * UTC anchoring is exact.
 */
export function daysBetween(a: string, b: string): number {
  const [ay, am, ad] = a.split("-").map(Number);
  const [by, bm, bd] = b.split("-").map(Number);
  const aMs = Date.UTC(ay, am - 1, ad);
  const bMs = Date.UTC(by, bm - 1, bd);
  return Math.round((bMs - aMs) / 86_400_000);
}

/** Add `n` days to a YYYY-MM-DD string, returning YYYY-MM-DD (local calendar). */
export function addDaysISO(iso: string, n: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  return toISODate(new Date(y, m - 1, d + n));
}

/** Add `n` calendar months to a YYYY-MM-DD string. Clamps overflowing days to
 *  the last valid day of the target month (e.g. Jan 31 +1mo → Feb 28/29). */
export function addMonthsISO(iso: string, n: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const targetMonthIndex0 = m - 1 + n;
  const targetYear = y + Math.floor(targetMonthIndex0 / 12);
  const normMonth = ((targetMonthIndex0 % 12) + 12) % 12;
  const lastDay = new Date(targetYear, normMonth + 1, 0).getDate();
  return buildISODate(targetYear, normMonth, Math.min(d, lastDay));
}

/** Add `n` years to a YYYY-MM-DD string. Clamps Feb 29 → Feb 28 in non-leap years. */
export function addYearsISO(iso: string, n: number): string {
  return addMonthsISO(iso, n * 12);
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
