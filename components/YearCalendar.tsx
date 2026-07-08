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
}

export function YearCalendar({ year, occurrencesByDate, getLabel, onSelectDay, today }: Props) {
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
        />
      ))}
    </div>
  );
}
