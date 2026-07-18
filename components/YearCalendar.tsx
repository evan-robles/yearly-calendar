"use client";

import { MONTH_NAMES } from "@/lib/date-utils";
import type { Label } from "@/lib/types";
import type { Occurrence } from "@/lib/recurrence";
import { MonthView } from "./MonthView";

interface Props {
  year: number;
  occurrencesByDate: Map<string, Occurrence[]>;
  getLabel: (id: string) => Label;
  onSelectDay: (isoDate: string) => void;
  today: string;
  /** ISO date of the keyboard-focused day, if any (Shift+arrow navigation). */
  focusedDate?: string | null;
}

export function YearCalendar({ year, occurrencesByDate, getLabel, onSelectDay, today, focusedDate }: Props) {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
      {MONTH_NAMES.map((_name, monthIdx) => (
        <MonthView
          key={monthIdx}
          year={year}
          monthIndex={monthIdx}
          occurrencesByDate={occurrencesByDate}
          getLabel={getLabel}
          onSelectDay={onSelectDay}
          today={today}
          focusedDate={focusedDate}
        />
      ))}
    </div>
  );
}
