"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, RotateCcw, Trash2, ChevronLeft, ChevronRight, CalendarClock, Tag } from "lucide-react";
import { useEvents } from "@/lib/useEvents";
import { useLabels } from "@/lib/useLabels";
import { useReminders } from "@/lib/useReminders";
import { useGistSync } from "@/lib/useGistSync";
import { todayISO, startOfYearISO, endOfYearISO } from "@/lib/date-utils";
import { expandToMap, expandEvent } from "@/lib/recurrence";
import type { CategoryId } from "@/lib/types";
import { YearCalendar } from "@/components/YearCalendar";
import { CategoryLegend } from "@/components/CategoryLegend";
import { DayDrawer } from "@/components/DayDrawer";
import { BulkDeleteDialog } from "@/components/BulkDeleteDialog";
import { BackupMenu } from "@/components/BackupMenu";
import { CalendarMenu } from "@/components/CalendarMenu";
import { RemindersToggle } from "@/components/RemindersToggle";
import { SyncMenu } from "@/components/SyncMenu";
import { FilterBar } from "@/components/FilterBar";
import { LabelManager } from "@/components/LabelManager";
import { ConfirmDialog } from "@/components/ConfirmDialog";

// The year of "today", computed at module load. Used only to seed the initial
// view and to highlight today — the visible window is now user-navigable.
const TODAY = todayISO();
const THIS_YEAR = Number(TODAY.slice(0, 4));
const WINDOW_SIZE = 4; // number of year tabs shown at once

export default function HomePage() {
  const ev = useEvents();
  const lbl = useLabels();
  const reminders = useReminders(ev.events, ev.hydrated, lbl.getLabel);
  const sync = useGistSync(ev.events, ev.hydrated, ev.mergeNewestWins, {
    labels: lbl.labels,
    stamp: lbl.labelsUpdatedAt,
    // Whole-set newest-wins: the side with the later stamp wins outright.
    reconcile: (remoteLabels, remoteStamp) => {
      if (Date.parse(remoteStamp) > Date.parse(lbl.labelsUpdatedAt)) {
        lbl.replaceLabels(remoteLabels, remoteStamp);
        return { labels: remoteLabels, stamp: remoteStamp };
      }
      return { labels: lbl.labels, stamp: lbl.labelsUpdatedAt };
    },
  });
  const [labelManagerOpen, setLabelManagerOpen] = useState(false);

  // Sliding 4-year window. `windowStart` is the first visible year; the user can
  // page it backward/forward or jump back to "today".
  const [windowStart, setWindowStart] = useState<number>(THIS_YEAR);
  const [year, setYear] = useState<number>(THIS_YEAR);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);

  // Filter state.
  const [query, setQuery] = useState("");
  const [activeCategories, setActiveCategories] = useState<Set<CategoryId>>(new Set());

  const visibleYears = useMemo(
    () => Array.from({ length: WINDOW_SIZE }, (_, i) => windowStart + i),
    [windowStart]
  );

  // Keep the selected `year` inside the visible window when paging. Clamp to the
  // NEAREST edge (not always the first year) so paging left keeps the selection
  // on the newly-revealed left year, and paging right keeps it on the right —
  // otherwise the calendar view can appear to "stick" on the same year.
  useEffect(() => {
    const lastYear = windowStart + WINDOW_SIZE - 1;
    if (year < windowStart) setYear(windowStart);
    else if (year > lastYear) setYear(lastYear);
  }, [windowStart, year]);

  // Filter predicate over base events (applied before recurrence expansion).
  const matchesFilter = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (title: string, description: string | undefined, category: CategoryId) => {
      if (activeCategories.size > 0 && !activeCategories.has(category)) return false;
      if (!q) return true;
      return title.toLowerCase().includes(q) || (description ?? "").toLowerCase().includes(q);
    };
  }, [query, activeCategories]);

  const filtering = query.trim().length > 0 || activeCategories.size > 0;

  const filteredEvents = useMemo(
    () => ev.events.filter((e) => matchesFilter(e.title, e.description, e.category)),
    [ev.events, matchesFilter]
  );

  // Expand (filtered) events into occurrences for the visible year only.
  const occurrencesByDate = useMemo(
    () => expandToMap(filteredEvents, startOfYearISO(year), endOfYearISO(year)),
    [filteredEvents, year]
  );

  // Occurrences for the selected day's drawer (from filtered set so the drawer
  // agrees with what's shown; when not filtering this is everything).
  const selectedOccurrences = useMemo(() => {
    if (!selectedDate) return [];
    return filteredEvents.flatMap((e) => expandEvent(e, selectedDate, selectedDate));
  }, [selectedDate, filteredEvents]);

  // Total matches across visible years (for the filter count).
  const matchCount = useMemo(() => {
    if (!filtering) return 0;
    let n = 0;
    for (const y of visibleYears) {
      const map = expandToMap(filteredEvents, startOfYearISO(y), endOfYearISO(y));
      for (const list of map.values()) n += list.length;
    }
    return n;
  }, [filtering, filteredEvents, visibleYears]);

  const toggleCategory = (id: CategoryId) => {
    setActiveCategories((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const clearFilters = () => {
    setQuery("");
    setActiveCategories(new Set());
  };

  const goToToday = () => {
    setWindowStart(THIS_YEAR);
    setYear(THIS_YEAR);
    didScrollRef.current = false; // allow re-scroll to today
  };

  // Left/Right arrow keys page the year window (same as the ◂ / ▸ buttons).
  // Ignored while typing in a field or when any modal/drawer is open, so arrows
  // still work normally inside inputs and dialogs.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const el = e.target as HTMLElement | null;
      const tag = el?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || el?.isContentEditable) return;
      if (selectedDate || bulkDeleteOpen || resetConfirmOpen || labelManagerOpen) return;
      e.preventDefault();
      setWindowStart((s) => s + (e.key === "ArrowRight" ? 1 : -1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedDate, bulkDeleteOpen, resetConfirmOpen, labelManagerOpen]);

  // Scroll today's cell into view once, after first hydration, but only when
  // we're on the year that actually contains today.
  const didScrollRef = useRef(false);
  useEffect(() => {
    if (didScrollRef.current) return;
    if (!ev.hydrated) return;
    if (year !== THIS_YEAR) return;
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

  // Event count per label id (drives the "used by N events" warning on delete).
  const labelUsage = useMemo(() => {
    const m = new Map<string, number>();
    for (const e of ev.events) m.set(e.category, (m.get(e.category) ?? 0) + 1);
    return m;
  }, [ev.events]);

  const btnBase =
    "inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-1.5 text-sm text-ink/80 shadow-soft transition-colors hover:bg-canvas hover:text-ink";

  return (
    <>
      {/* Sticky frosted header */}
      <header className="glass sticky top-0 z-20 border-b border-line/70">
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand text-white shadow-card">
              <CalendarDays className="h-5 w-5" />
            </span>
            <div>
              <h1 className="font-display text-xl font-bold tracking-tight text-ink">Yearly Calendar</h1>
              <p className="text-xs text-muted">
                {visibleYears[0]} – {visibleYears[visibleYears.length - 1]}
                <span className="mx-1.5 text-line">·</span>
                <span className="font-medium text-ink/70">{totals.done}</span> of {totals.all} done
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
            <button onClick={() => setLabelManagerOpen(true)} className={btnBase} title="Create and manage labels">
              <Tag className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Labels</span>
            </button>
            <CalendarMenu
              events={ev.events}
              labels={lbl.labels}
              getLabel={lbl.getLabel}
              onImport={ev.addMany}
              onCreateImportedLabel={() =>
                lbl.createLabel({ label: "Imported", bg: "#E2E4E8", accent: "#4A5568", remindByDefault: false })
              }
            />
            <BackupMenu events={ev.events} onReplace={ev.replaceEvents} onMerge={ev.mergeEvents} />
            <button
              onClick={() => setBulkDeleteOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-1.5 text-sm text-ink/80 shadow-soft transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-700"
              title="Delete events by week, month, year, or all at once"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Bulk delete</span>
            </button>
            <button
              onClick={() => setResetConfirmOpen(true)}
              className={btnBase}
              title="Reset to the original seeded events"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Reset</span>
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8">
        {/* Year nav with paging */}
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 rounded-xl border border-line bg-surface p-1 shadow-soft">
            <button
              onClick={() => setWindowStart((s) => s - 1)}
              className="inline-flex items-center rounded-lg p-1.5 text-muted transition-colors hover:bg-canvas hover:text-ink"
              title="Earlier years"
              aria-label="Earlier years"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            {visibleYears.map((y) => (
              <button
                key={y}
                onClick={() => setYear(y)}
                className={
                  "rounded-lg px-3 py-1.5 text-sm font-semibold transition-all " +
                  (year === y
                    ? "bg-brand text-white shadow-card"
                    : "text-ink/70 hover:bg-canvas hover:text-ink")
                }
              >
                {y}
              </button>
            ))}
            <button
              onClick={() => setWindowStart((s) => s + 1)}
              className="inline-flex items-center rounded-lg p-1.5 text-muted transition-colors hover:bg-canvas hover:text-ink"
              title="Later years"
              aria-label="Later years"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <button
            onClick={goToToday}
            className={btnBase}
            title="Jump back to the current year"
          >
            <CalendarClock className="h-3.5 w-3.5" />
            Today
          </button>
          <div className="ml-auto">
            <CategoryLegend labels={lbl.labels} onManage={() => setLabelManagerOpen(true)} />
          </div>
        </div>

        {/* Search & filter */}
        <FilterBar
          query={query}
          onQuery={setQuery}
          labels={lbl.labels}
          activeCategories={activeCategories}
          onToggleCategory={toggleCategory}
          onClear={clearFilters}
          matchCount={matchCount}
          filtering={filtering}
        />

        {/* Calendar */}
        {ev.hydrated ? (
          <YearCalendar
            year={year}
            occurrencesByDate={occurrencesByDate}
            getLabel={lbl.getLabel}
            onSelectDay={setSelectedDate}
            today={TODAY}
          />
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-64 animate-pulse rounded-2xl border border-line bg-surface/60 shadow-soft" />
            ))}
          </div>
        )}

      {/* Day drawer (modal-ish slide-over) */}
      {selectedDate && (
        <DayDrawer
          date={selectedDate}
          occurrences={selectedOccurrences}
          labels={lbl.labels}
          getLabel={lbl.getLabel}
          onManageLabels={() => setLabelManagerOpen(true)}
          onClose={() => setSelectedDate(null)}
          onAdd={ev.addEvent}
          onUpdate={ev.updateEvent}
          onDelete={ev.deleteEvent}
          onToggleComplete={ev.toggleOccurrenceComplete}
        />
      )}

      {/* Bulk-delete dialog */}
      {bulkDeleteOpen && (
        <BulkDeleteDialog
          events={ev.events}
          availableYears={visibleYears}
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

      {/* Label manager */}
      {labelManagerOpen && (
        <LabelManager
          labels={lbl.labels}
          usageById={labelUsage}
          onAdd={lbl.addLabel}
          onUpdate={lbl.updateLabel}
          onDelete={lbl.deleteLabel}
          onMove={lbl.moveLabel}
          onReset={lbl.resetLabels}
          onClose={() => setLabelManagerOpen(false)}
        />
      )}
      </main>
    </>
  );
}
