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
  types.ts         CalendarEvent, Recurrence, CategoryId, CATEGORIES.
  seed.ts          Default events carried over from the LaTeX calendar.
  useEvents.ts     React hook that owns event state + localStorage I/O.
  useGistSync.ts   React hook for cross-device sync via a private GitHub gist.
  useReminders.ts  Notification sweep (expands recurring events).
  recurrence.ts    Render-time expansion of recurring events into occurrences.
  validation.ts    Shared event validation/coercion (import, restore, sync).
  migrate.ts       Versioned localStorage migration (v1 → v2).
  date-utils.ts    Pure date helpers (month grid, ISO math, DST-safe diff).
```

## What changed vs. the original

- **Cross-device sync** via a private GitHub gist (see above).
- **Recurring events** — weekly / monthly / every-semester / yearly, with an
  optional end date. Stored once and expanded at render time; each occurrence
  can be marked done independently.
- **Search & category filter** — a search bar (title/description) plus category
  chips filter what's shown across the visible years, non-destructively.
- **Backward/forward year paging** — the 4-year window slides with ◂ / ▸ and a
  **Today** button, so past and far-future years are reachable.
- **Correctness** — every event carries an `updatedAt` (drives newest-wins
  sync); localStorage is versioned + migrated; the reminder day-count is
  DST-safe; and blocking `window.confirm` dialogs were replaced with in-app ones.

## Cross-device sync (GitHub Gist)

By default all data is browser-local. To make your events follow you across
devices, the **Sync** menu in the header mirrors them to a **private GitHub
gist**.

**Setup**

1. Click **Sync → Create a token with only the “gist” scope**. This opens
   GitHub's token page pre-filled with the single `gist` scope. Generate the
   token and copy it.
2. Paste the token into the Sync panel and click **Create & connect**. The app
   creates a private gist named `yearly-calendar.json` and remembers its id.
3. On another device, open the site, click **Sync → Use existing gist**, paste
   the same token and the gist id (shown in the panel / the gist URL), and
   connect.
4. Use **Sync now** to reconcile, or enable **Auto-sync** to pull on load and
   push a few seconds after each change.

**How conflicts are resolved.** Each event carries an `updatedAt` timestamp.
Syncing pulls the remote list, merges it with the local one keeping whichever
copy of each event (by `id`) was edited most recently (**newest-wins**), pushes
the merged result back, and updates local state. Deletions are not tombstoned —
if you delete an event on one device but it still exists (newer) on another,
sync can bring it back; delete on both or re-sync after deleting.

**Security model.**

- The token is stored **only in this browser's `localStorage`** and is sent
  **only to `api.github.com` over HTTPS**. It is never committed to the repo,
  never logged, and never sent anywhere else.
- The gist is **private**. Only someone with your token can read it.
- Use a **fine-grained or classic token limited to the `gist` scope** — it
  cannot touch your repos or other data.
- **Disconnect** clears the token from the browser. To fully revoke, delete the
  token at <https://github.com/settings/tokens> (and delete the gist if desired).

> This is the standard token-based pattern for syncing a static (serverless)
> app. If you'd prefer the token never live in the browser, that requires adding
> a backend, which trades away the free static hosting.

## Customizing

- **Add or rename categories** — edit `lib/types.ts`. The `CATEGORIES` map is
  the single source of truth for IDs, labels, colors, and priorities. Changes
  flow through to the legend, drawer, and cell tints automatically.
- **Change the seed events** — edit `lib/seed.ts`. The `id` strings just need
  to be unique; using `seed-NNN` is a convention, not a requirement. Note
  that seed changes only show up for users who haven't yet saved anything to
  localStorage (or who hit the Reset button).
- **Change the year span** — edit `WINDOW_SIZE` in `app/page.tsx` (default 4).
  The visible window starts at the current year and slides via the ◂ / ▸ paging
  controls; `WINDOW_SIZE` sets how many year tabs show at once.
- **Switch to Sunday-start** — edit `DAY_HEADERS_MON_FIRST` and the
  `offsetMonFirst` calculation in `lib/date-utils.ts`.

## Notes & caveats

- This is a single-user app. Data is browser-local by default; optional
  cross-device sync is available via a private GitHub gist (see **Cross-device
  sync** above). There is no multi-user auth — the gist is your personal store.
  For real multi-user/real-time sync you'd swap `useEvents`/`useGistSync` for a
  hook that talks to a database (Supabase, Vercel Postgres, etc.); the rest of
  the UI doesn't need to change.
- `localStorage` has a ~5MB cap; this app uses well under 1KB per event.
- Hydration: `useEvents` reads localStorage in `useEffect` so SSR and CSR
  agree on the initial render. While hydrating, the page shows a brief
  "Loading…" placeholder.
