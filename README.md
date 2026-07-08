# Yearly Calendar

A 4-year planning calendar built with Next.js 14 (App Router), TypeScript, and
Tailwind CSS. Color-coded events by category, with add / edit / delete and a
"mark done" toggle that strikes events through. All data lives in `localStorage`
in your browser — no backend.

## Setup

Requires Node 18+ and npm.

```bash
npm install
npm run dev
```

Open <http://localhost:3000>.

For a production build:

```bash
npm run build
npm start
```

## Features

- **4-year window** — auto-starts at the current year and shows the next three
  years as tabs at the top.
- **All months, all days** — every month renders a full Mon-first grid; days
  outside the month are visibly muted.
- **Color-coded categories** — 8 built-in categories (Deadline, Milestone,
  UChicago internal, Fellowship, Application opens, Research, Academic,
  Reminder), each with its own tint and accent.
- **Click a day** to open a side drawer listing every event on that date.
- **Add / edit / delete events** from the drawer. Each event has a title,
  date, category, optional description, and a "done" flag.
- **Bulk delete** — header button opens a dialog where you pick a scope
  (Week / Month / Year / All), pick the period (which week, month, or year),
  see a live count of matching events, and confirm. Useful for clearing a
  finished semester, an entire year you no longer need, or starting fresh.
- **Today is highlighted** — the current day cell is filled blue and ringed,
  and the page auto-scrolls today into view on first load.
- **Reminders** — toggle browser notifications from the Reminders dropdown.
  When on, each event reminds you according to its own setting:
    - **Default** (the initial setting) — fires 7, 3, 1, and 0 days before
      the event, but only for Deadline / Milestone / UChicago categories.
    - **None** — never fires for this event.
    - **Custom** — pick any combination of 60 / 30 / 14 / 7 / 3 / 1 / day-of
      lead times. Fires regardless of category.
  Each event card in the day drawer shows a small bell badge summarising its
  reminder setting. A "Send a test notification" button lets you verify
  permissions are working; if it doesn't appear, a follow-up dialog walks
  you through OS-level troubleshooting (macOS notifications often need to
  be enabled in System Settings, even when the browser permission is granted).
  Reminders fire while the tab is open — there's no service worker, so they
  won't fire when the tab is closed.
- **Backup & restore** — the Backup dropdown in the header lets you
  download all your events as a timestamped `.json` file, and later restore
  from one. Restore offers two modes:
    - **Replace** — discards current events, uses only the file's.
    - **Merge** — adds the file's events to the current ones; events that
      share an `id` are overwritten by the file's version.
  The backup file is plain JSON and human-readable — you can inspect or
  hand-edit it in any text editor.
- **Cross out done items** — checking the box strikes the event through both
  in the drawer and in the calendar cell.
- **localStorage persistence** — your changes survive page reloads. The
  storage key is `yearly-calendar:events:v1`.
- **Today's date** is ringed in blue.
- **Reset button** in the header restores the seed events (the planning data
  carried over from the LaTeX calendar).
- **Cell tinting** — when a day has multiple events, the cell takes the color
  of the highest-priority one (Deadline > Milestone > UChicago > Fellowship
  > Opens > Research > Academic > Reminder). Cells with all events done are
  not tinted.

## Project structure

```
app/
  layout.tsx       Root HTML shell.
  page.tsx         The single page; wires header, year tabs, calendar, drawer.
  globals.css      Tailwind directives only.
components/
  YearCalendar.tsx Renders 12 MonthView grids.
  MonthView.tsx    One month, with day cells; cells show up to 3 events + "+N".
  DayDrawer.tsx    Slide-over panel for a day's events; contains EventCard
                   and EventForm subcomponents.
  CategoryLegend.tsx  Color-key dropdown.
lib/
  types.ts         CalendarEvent, CategoryId, CATEGORIES (color metadata).
  seed.ts          Default events carried over from the LaTeX calendar.
  useEvents.ts     React hook that owns event state + localStorage I/O.
  date-utils.ts    Pure date helpers (month grid, ISO formatting).
```

## Customizing

- **Add or rename categories** — edit `lib/types.ts`. The `CATEGORIES` map is
  the single source of truth for IDs, labels, colors, and priorities. Changes
  flow through to the legend, drawer, and cell tints automatically.
- **Change the seed events** — edit `lib/seed.ts`. The `id` strings just need
  to be unique; using `seed-NNN` is a convention, not a requirement. Note
  that seed changes only show up for users who haven't yet saved anything to
  localStorage (or who hit the Reset button).
- **Change the year span** — edit `YEARS` in `app/page.tsx`. The current logic
  starts at `today.getFullYear()` and shows four years; tweak the array if
  you want a different window.
- **Switch to Sunday-start** — edit `DAY_HEADERS_MON_FIRST` and the
  `offsetMonFirst` calculation in `lib/date-utils.ts`.

## Notes & caveats

- This is a single-user, browser-local app. No auth, no sync between devices.
  If you want multi-device sync, swap `useEvents` for a hook that talks to a
  database (Supabase, Vercel Postgres, etc.) — the rest of the UI doesn't need
  to change.
- `localStorage` has a ~5MB cap; this app uses well under 1KB per event.
- Hydration: `useEvents` reads localStorage in `useEffect` so SSR and CSR
  agree on the initial render. While hydrating, the page shows a brief
  "Loading…" placeholder.
