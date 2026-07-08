"use client";

import { CATEGORIES } from "@/lib/types";
import type { CalendarEvent } from "@/lib/types";
import { MONTH_NAMES, DAY_HEADERS_MON_FIRST, monthGrid, buildISODate } from "@/lib/date-utils";

interface MonthProps {
  year: number;
  monthIndex: number;
  eventsByDate: Map<string, CalendarEvent[]>;
  onSelectDay: (isoDate: string) => void;
  today: string;
}

export function MonthView({ year, monthIndex, eventsByDate, onSelectDay, today }: MonthProps) {
  const grid = monthGrid(year, monthIndex);

  return (
    <section className="rounded-lg border border-neutral-200 bg-white shadow-sm">
      <header className="border-b border-neutral-200 bg-neutral-900 px-3 py-2 text-white">
        <h2 className="text-sm font-semibold">
          {MONTH_NAMES[monthIndex]} <span className="text-neutral-400">{year}</span>
        </h2>
      </header>

      {/* Day-of-week header */}
      <div className="grid grid-cols-7 border-b border-neutral-200 bg-neutral-50 text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
        {DAY_HEADERS_MON_FIRST.map((d) => (
          <div key={d} className="px-1.5 py-1.5 text-center">
            {d}
          </div>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7">
        {grid.flat().map((day, idx) => {
          if (day === 0) {
            return <div key={idx} className="aspect-[5/4] border-b border-r border-neutral-100 bg-neutral-50/50 last:border-r-0" />;
          }
          const iso = buildISODate(year, monthIndex, day);
          const events = eventsByDate.get(iso) ?? [];

          // Pick the highest-priority category color for the cell tint.
          const topCategory =
            events.length > 0
              ? events
                  .map((e) => CATEGORIES[e.category])
                  .sort((a, b) => a.priority - b.priority)[0]
              : null;

          const isToday = iso === today;
          const isPast = iso < today;

          // Style precedence: today (blue) > past (gray) > active events (category tint).
          // Past days override the category tint so the eye treats them as
          // "behind us" — past events are still visible as chips inside.
          const tintStyle = isToday
            ? { backgroundColor: "#DBEAFE" } // blue-100
            : isPast
            ? { backgroundColor: "#EEEEEE" } // faint gray
            : topCategory && events.some((e) => !e.completed)
            ? { backgroundColor: topCategory.bg + "55" } // ~33% opacity
            : undefined;

          return (
            <button
              key={idx}
              onClick={() => onSelectDay(iso)}
              style={tintStyle}
              data-today={isToday ? "true" : undefined}
              className={
                "group relative aspect-[5/4] cursor-pointer border-b border-r border-neutral-100 p-1 text-left transition-colors last:border-r-0 " +
                (isToday
                  ? "ring-2 ring-inset ring-blue-500 hover:bg-blue-200/60"
                  : isPast
                  ? "hover:bg-neutral-200"
                  : "hover:bg-neutral-100")
              }
            >
              <div className="flex items-baseline justify-between">
                <span
                  className={
                    "text-xs font-semibold " +
                    (isToday
                      ? "text-blue-700"
                      : isPast
                      ? "text-neutral-400"
                      : "text-neutral-700")
                  }
                >
                  {day}
                </span>
                {events.length > 3 && (
                  <span className="text-[9px] text-neutral-500">+{events.length - 3}</span>
                )}
              </div>

              <ul className="mt-0.5 space-y-0.5">
                {events.slice(0, 3).map((e) => {
                  const cat = CATEGORIES[e.category];
                  return (
                    <li
                      key={e.id}
                      className={
                        "truncate rounded px-1 text-[9px] leading-tight " +
                        (e.completed ? "text-neutral-400 line-through" : "text-neutral-800")
                      }
                      style={{
                        backgroundColor: e.completed ? "transparent" : cat.bg,
                        borderLeft: `2px solid ${cat.accent}`,
                      }}
                      title={e.title + (e.description ? ` — ${e.description}` : "")}
                    >
                      {e.title}
                    </li>
                  );
                })}
              </ul>
            </button>
          );
        })}
      </div>
    </section>
  );
}
