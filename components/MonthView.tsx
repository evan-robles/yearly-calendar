"use client";

import { Link2 } from "lucide-react";
import type { Label } from "@/lib/types";
import type { Occurrence } from "@/lib/recurrence";
import { MONTH_NAMES, DAY_HEADERS_MON_FIRST, monthGrid, buildISODate } from "@/lib/date-utils";

// How many events show as full text chips before the rest collapse to compact
// colored dots. 1 = show the top-priority event, everything else as dots.
const MAX_CHIPS = 1;

interface MonthProps {
  year: number;
  monthIndex: number;
  occurrencesByDate: Map<string, Occurrence[]>;
  getLabel: (id: string) => Label;
  onSelectDay: (isoDate: string) => void;
  today: string;
}

export function MonthView({ year, monthIndex, occurrencesByDate, getLabel, onSelectDay, today }: MonthProps) {
  const grid = monthGrid(year, monthIndex);
  const isCurrentMonth = today.slice(0, 7) === `${year}-${String(monthIndex + 1).padStart(2, "0")}`;

  return (
    <section className="overflow-hidden rounded-2xl border border-line bg-surface shadow-card transition-shadow hover:shadow-pop">
      <header className="flex items-center justify-between px-3.5 py-2.5">
        <h2 className="font-display text-sm font-semibold text-ink">
          {MONTH_NAMES[monthIndex]} <span className="font-normal text-muted">{year}</span>
        </h2>
        {isCurrentMonth && (
          <span className="rounded-full bg-brand-soft px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-brand">
            Now
          </span>
        )}
      </header>

      {/* Day-of-week header */}
      <div className="grid grid-cols-7 border-y border-line/70 bg-canvas/60 text-[10px] font-semibold uppercase tracking-wider text-muted">
        {DAY_HEADERS_MON_FIRST.map((d) => (
          <div key={d} className="px-1.5 py-1.5 text-center">
            {d.charAt(0)}
            <span className="hidden sm:inline">{d.slice(1)}</span>
          </div>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7">
        {grid.flat().map((day, idx) => {
          if (day === 0) {
            return (
              <div
                key={idx}
                className="aspect-[5/4] border-b border-r border-line/50 bg-canvas/40 last:border-r-0"
              />
            );
          }
          const iso = buildISODate(year, monthIndex, day);
          const occs = occurrencesByDate.get(iso) ?? [];
          const hasLink = occs.some((o) => (o.event.links?.length ?? 0) > 0);

          // Highest-priority label color for the cell tint.
          const topCategory =
            occs.length > 0
              ? occs.map((o) => getLabel(o.event.category)).sort((a, b) => a.priority - b.priority)[0]
              : null;

          const isToday = iso === today;
          const isPast = iso < today;

          // Style precedence: today (brand) > active events (soft category tint)
          // > past (slight gray) > default.
          const tintStyle = isToday
            ? { backgroundColor: "rgb(var(--brand-soft))" }
            : topCategory && occs.some((o) => !o.completed)
            ? { backgroundColor: topCategory.bg + "3A" } // ~23% opacity — subtle
            : isPast
            ? { backgroundColor: "rgb(var(--muted) / 0.08)" } // faint gray for past days
            : undefined;

          return (
            <button
              key={idx}
              onClick={() => onSelectDay(iso)}
              style={tintStyle}
              data-today={isToday ? "true" : undefined}
              className={
                "group relative aspect-[5/4] min-w-0 cursor-pointer overflow-hidden border-b border-r border-line/50 p-1 text-left transition-colors last:border-r-0 " +
                (isToday
                  ? "ring-2 ring-inset ring-brand hover:brightness-[0.97]"
                  : isPast
                  ? "hover:bg-canvas"
                  : "hover:bg-canvas")
              }
            >
              <div className="flex items-center justify-between">
                <span
                  className={
                    "inline-flex h-5 min-w-5 items-center justify-center text-xs font-semibold " +
                    (isToday
                      ? "rounded-full bg-brand px-1 text-white"
                      : isPast
                      ? "text-muted/70"
                      : "text-ink/80")
                  }
                >
                  {day}
                </span>
                {hasLink && <Link2 className="h-2.5 w-2.5 text-muted" />}
              </div>

              {/* Show the top-priority event as a full chip; every additional
                  event collapses to a tiny label-colored dot (hollow when done)
                  with a count, so busy days stay compact and countable. */}
              {(() => {
                // Sort by label priority (lower = more important) so the chip and
                // the leading dots reflect importance.
                const ordered = [...occs].sort(
                  (a, b) => getLabel(a.event.category).priority - getLabel(b.event.category).priority
                );
                const chips = ordered.slice(0, MAX_CHIPS);
                const dots = ordered.slice(MAX_CHIPS);
                return (
                  <>
                    <ul className="mt-0.5 min-w-0 space-y-0.5">
                      {chips.map((o) => {
                        const cat = getLabel(o.event.category);
                        return (
                          <li
                            key={o.event.id + o.date}
                            className={
                              "truncate rounded-[3px] px-1 py-px text-[9px] font-medium leading-tight " +
                              (o.completed ? "text-muted line-through" : "text-ink/90")
                            }
                            style={{
                              backgroundColor: o.completed ? "transparent" : cat.bg + "D0",
                              borderLeft: `2.5px solid ${cat.accent}`,
                            }}
                            title={o.event.title + (o.event.description ? ` — ${o.event.description}` : "")}
                          >
                            {o.event.title}
                          </li>
                        );
                      })}
                    </ul>
                    {dots.length > 0 && (
                      <div className="mt-1 flex flex-wrap items-center gap-1">
                        {dots.map((o) => {
                          const cat = getLabel(o.event.category);
                          return (
                            <span
                              key={o.event.id + o.date}
                              className="h-2 w-2 rounded-full"
                              style={
                                o.completed
                                  ? { border: `1.5px solid ${cat.accent}`, opacity: 0.5 }
                                  : { backgroundColor: cat.accent }
                              }
                              title={o.event.title + (o.completed ? " (done)" : "")}
                            />
                          );
                        })}
                        <span className="text-[9px] font-semibold text-muted">+{dots.length}</span>
                      </div>
                    )}
                  </>
                );
              })()}
            </button>
          );
        })}
      </div>
    </section>
  );
}
