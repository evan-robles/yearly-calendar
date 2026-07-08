"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, RotateCcw, Trash2 } from "lucide-react";
import { useEvents } from "@/lib/useEvents";
import { useReminders } from "@/lib/useReminders";
import { useGistSync } from "@/lib/useGistSync";
import { todayISO } from "@/lib/date-utils";
import { YearCalendar } from "@/components/YearCalendar";
import { CategoryLegend } from "@/components/CategoryLegend";
import { DayDrawer } from "@/components/DayDrawer";
import { BulkDeleteDialog } from "@/components/BulkDeleteDialog";
import { BackupMenu } from "@/components/BackupMenu";
import { RemindersToggle } from "@/components/RemindersToggle";
import { SyncMenu } from "@/components/SyncMenu";
import { ConfirmDialog } from "@/components/ConfirmDialog";

// 4-year window starting from "now" (the year of today). Recomputed at module
// load — fine for an SPA-style app; if you want it strictly relative to the
// current second, recompute inside the component.
const TODAY = todayISO();
const START_YEAR = Number(TODAY.slice(0, 4));
const YEARS = [START_YEAR, START_YEAR + 1, START_YEAR + 2, START_YEAR + 3];

export default function HomePage() {
  const ev = useEvents();
  const reminders = useReminders(ev.events, ev.hydrated);
  const sync = useGistSync(ev.events, ev.hydrated, ev.mergeNewestWins);
  const [year, setYear] = useState<number>(START_YEAR);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);

  // Scroll today's cell into view once, after first hydration, but only when
  // we're on the year that actually contains today.
  const didScrollRef = useRef(false);
  useEffect(() => {
    if (didScrollRef.current) return;
    if (!ev.hydrated) return;
    if (year !== START_YEAR) return;
    const t = window.setTimeout(() => {
      const el = document.querySelector('[data-today="true"]');
      if (el) {
        el.scrollIntoView({ behavior: "auto", block: "center" });
        didScrollRef.current = true;
      }
    }, 50);
    return () => window.clearTimeout(t);
  }, [ev.hydrated, year]);

  const totals = useMemo(() => {
    const all = ev.events.length;
    const done = ev.events.filter((e) => e.completed).length;
    return { all, done };
  }, [ev.events]);

  return (
    <main className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8">
      {/* Header */}
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <CalendarDays className="h-8 w-8 text-neutral-700" />
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Yearly Calendar</h1>
            <p className="text-sm text-neutral-500">
              {YEARS[0]} – {YEARS[YEARS.length - 1]} · {totals.done} of {totals.all} done
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <RemindersToggle
            enabled={reminders.enabled}
            permission={reminders.permission}
            supported={reminders.supported}
            onToggle={reminders.toggle}
            onTest={reminders.testNotification}
          />
          <SyncMenu sync={sync} />
          <BackupMenu
            events={ev.events}
            onReplace={ev.replaceEvents}
            onMerge={ev.mergeEvents}
          />
          <button
            onClick={() => setBulkDeleteOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm text-neutral-700 hover:bg-red-50 hover:text-red-700 hover:border-red-300"
            title="Delete events by week, month, year, or all at once"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Bulk delete
          </button>
          <button
            onClick={() => setResetConfirmOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm text-neutral-700 hover:bg-neutral-100"
            title="Reset to the original seeded events"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset
          </button>
        </div>
      </header>

      {/* Year nav */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {YEARS.map((y) => (
          <button
            key={y}
            onClick={() => setYear(y)}
            className={
              "rounded-md px-3 py-1.5 text-sm font-medium transition-colors " +
              (year === y
                ? "bg-neutral-900 text-white"
                : "bg-white text-neutral-700 hover:bg-neutral-100 border border-neutral-200")
            }
          >
            {y}
          </button>
        ))}
        <div className="ml-auto">
          <CategoryLegend />
        </div>
      </div>

      {/* Calendar */}
      {ev.hydrated ? (
        <YearCalendar
          year={year}
          eventsByDate={ev.eventsByDate}
          onSelectDay={setSelectedDate}
          today={TODAY}
        />
      ) : (
        <div className="rounded-md border border-neutral-200 bg-white p-12 text-center text-sm text-neutral-500">
          Loading…
        </div>
      )}

      {/* Day drawer (modal-ish slide-over) */}
      {selectedDate && (
        <DayDrawer
          date={selectedDate}
          events={ev.eventsByDate.get(selectedDate) ?? []}
          onClose={() => setSelectedDate(null)}
          onAdd={ev.addEvent}
          onUpdate={ev.updateEvent}
          onDelete={ev.deleteEvent}
          onToggleComplete={ev.toggleComplete}
        />
      )}

      {/* Bulk-delete dialog */}
      {bulkDeleteOpen && (
        <BulkDeleteDialog
          events={ev.events}
          availableYears={YEARS}
          today={TODAY}
          onCancel={() => setBulkDeleteOpen(false)}
          onConfirm={(predicate) => {
            ev.deleteMany(predicate);
            setBulkDeleteOpen(false);
          }}
        />
      )}

      {/* Reset confirmation */}
      {resetConfirmOpen && (
        <ConfirmDialog
          title="Reset to seed events?"
          message={"This discards every change you've made and restores the original seeded events.\nThis cannot be undone."}
          confirmLabel="Reset"
          destructive
          onCancel={() => setResetConfirmOpen(false)}
          onConfirm={() => {
            ev.resetToSeed();
            setResetConfirmOpen(false);
          }}
        />
      )}
    </main>
  );
}
