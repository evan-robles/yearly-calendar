"use client";

import { useEffect, useMemo, useState } from "react";
import { Trash2, X, AlertTriangle } from "lucide-react";
import type { CalendarEvent } from "@/lib/types";
import {
  MONTH_NAMES,
  todayISO,
  startOfWeekISO,
  endOfWeekISO,
  startOfMonthISO,
  endOfMonthISO,
  startOfYearISO,
  endOfYearISO,
  formatLong,
} from "@/lib/date-utils";

type Scope = "week" | "month" | "year" | "all";

interface Props {
  events: CalendarEvent[];
  /** Years available for the year/month pickers (matches the calendar tabs). */
  availableYears: number[];
  /** ISO of today — drives default selections. */
  today: string;
  onCancel: () => void;
  /** Called with a predicate that selects events to remove. */
  onConfirm: (predicate: (e: CalendarEvent) => boolean) => void;
}

export function BulkDeleteDialog({ events, availableYears, today, onCancel, onConfirm }: Props) {
  const [scope, setScope] = useState<Scope>("month");

  // Period selectors. Each scope reads the relevant pieces of state.
  const [weekAnchor, setWeekAnchor] = useState<string>(today); // any date inside the week
  const [year, setYear] = useState<number>(Number(today.slice(0, 4)));
  const [month, setMonth] = useState<number>(Number(today.slice(5, 7)) - 1); // 0-indexed

  // Close on Escape.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onCancel]);

  // Compute the date range the current selection refers to.
  const range = useMemo<{ start: string; end: string } | null>(() => {
    switch (scope) {
      case "week":
        return { start: startOfWeekISO(weekAnchor), end: endOfWeekISO(weekAnchor) };
      case "month":
        return { start: startOfMonthISO(year, month), end: endOfMonthISO(year, month) };
      case "year":
        return { start: startOfYearISO(year), end: endOfYearISO(year) };
      case "all":
        return null;
    }
  }, [scope, weekAnchor, year, month]);

  const predicate = useMemo<(e: CalendarEvent) => boolean>(() => {
    if (range === null) return () => true;
    const { start, end } = range;
    return (e: CalendarEvent) => e.date >= start && e.date <= end;
  }, [range]);

  const matchedCount = useMemo(() => events.filter(predicate).length, [events, predicate]);

  const summary = useMemo(() => {
    if (scope === "all") return "every event in your calendar";
    if (!range) return "";
    if (scope === "week") {
      return `the week of ${formatLong(range.start)} through ${formatLong(range.end)}`;
    }
    if (scope === "month") return `${MONTH_NAMES[month]} ${year}`;
    if (scope === "year") return `the year ${year}`;
    return "";
  }, [scope, range, month, year]);

  const handleConfirm = () => {
    if (matchedCount === 0) return;
    if (
      confirm(
        `Permanently delete ${matchedCount} event${matchedCount === 1 ? "" : "s"} from ${summary}?\n\nThis cannot be undone.`
      )
    ) {
      onConfirm(predicate);
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} aria-hidden="true" />

      <div className="relative w-full max-w-md rounded-lg bg-white shadow-2xl">
        <header className="flex items-center justify-between border-b border-neutral-200 px-4 py-3">
          <div className="flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-red-600" />
            <h2 className="text-base font-semibold">Bulk delete events</h2>
          </div>
          <button
            onClick={onCancel}
            className="rounded-md p-1 text-neutral-500 hover:bg-neutral-100"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="space-y-4 p-4">
          {/* Scope selector */}
          <fieldset>
            <legend className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
              Scope
            </legend>
            <div className="grid grid-cols-4 gap-1.5">
              {(["week", "month", "year", "all"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setScope(s)}
                  className={
                    "rounded-md border px-2 py-1.5 text-sm capitalize transition-colors " +
                    (scope === s
                      ? "border-neutral-900 bg-neutral-900 text-white"
                      : "border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50")
                  }
                >
                  {s}
                </button>
              ))}
            </div>
          </fieldset>

          {/* Period selector — depends on scope */}
          {scope === "week" && (
            <label className="block">
              <span className="block text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
                Pick any date in the week
              </span>
              <input
                type="date"
                value={weekAnchor}
                onChange={(e) => setWeekAnchor(e.target.value || today)}
                className="mt-1 w-full rounded-md border border-neutral-300 bg-white px-2 py-1.5 text-sm focus:border-neutral-500 focus:outline-none"
              />
            </label>
          )}

          {scope === "month" && (
            <div className="grid grid-cols-2 gap-2">
              <label className="block">
                <span className="block text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
                  Month
                </span>
                <select
                  value={month}
                  onChange={(e) => setMonth(Number(e.target.value))}
                  className="mt-1 w-full rounded-md border border-neutral-300 bg-white px-2 py-1.5 text-sm focus:border-neutral-500 focus:outline-none"
                >
                  {MONTH_NAMES.map((n, i) => (
                    <option key={n} value={i}>{n}</option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="block text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
                  Year
                </span>
                <select
                  value={year}
                  onChange={(e) => setYear(Number(e.target.value))}
                  className="mt-1 w-full rounded-md border border-neutral-300 bg-white px-2 py-1.5 text-sm focus:border-neutral-500 focus:outline-none"
                >
                  {availableYears.map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </label>
            </div>
          )}

          {scope === "year" && (
            <label className="block">
              <span className="block text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
                Year
              </span>
              <select
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className="mt-1 w-full rounded-md border border-neutral-300 bg-white px-2 py-1.5 text-sm focus:border-neutral-500 focus:outline-none"
              >
                {availableYears.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </label>
          )}

          {/* Live summary */}
          <div
            className={
              "flex gap-2 rounded-md border p-2.5 text-sm " +
              (matchedCount === 0
                ? "border-neutral-200 bg-neutral-50 text-neutral-500"
                : "border-red-200 bg-red-50 text-red-900")
            }
          >
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <div className="leading-snug">
              {matchedCount === 0 ? (
                <>No events match — nothing to delete in {summary}.</>
              ) : (
                <>
                  <strong>{matchedCount}</strong> event{matchedCount === 1 ? "" : "s"} will be
                  permanently deleted from {summary}.
                </>
              )}
            </div>
          </div>
        </div>

        <footer className="flex items-center justify-end gap-2 border-t border-neutral-200 px-4 py-3">
          <button
            onClick={onCancel}
            className="rounded-md px-3 py-1.5 text-sm text-neutral-600 hover:bg-neutral-100"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={matchedCount === 0}
            className="inline-flex items-center gap-1.5 rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete {matchedCount > 0 ? matchedCount : ""}
          </button>
        </footer>
      </div>
    </div>
  );
}
