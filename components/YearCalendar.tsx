"use client";

import { MONTH_NAMES } from "@/lib/date-utils";
import type { CalendarEvent } from "@/lib/types";
import { MonthView } from "./MonthView";

interface Props {
  year: number;
  eventsByDate: Map<string, CalendarEvent[]>;
  onSelectDay: (isoDate: string) => void;
  today: string;
}

export function YearCalendar({ year, eventsByDate, onSelectDay, today }: Props) {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
      {MONTH_NAMES.map((_name, monthIdx) => (
        <MonthView
          key={monthIdx}
          year={year}
          monthIndex={monthIdx}
          eventsByDate={eventsByDate}
          onSelectDay={onSelectDay}
          today={today}
        />
      ))}
    </div>
  );
}
