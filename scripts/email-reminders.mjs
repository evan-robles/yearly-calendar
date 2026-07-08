#!/usr/bin/env node
/**
 * Email reminders for Yearly Calendar.
 *
 * Runs on a schedule (GitHub Actions) OUTSIDE the static app. It reads the same
 * private gist the app syncs to (`yearly-calendar.json` = { version, events,
 * labels, labelsUpdatedAt }), figures out which events are "due" today per their
 * reminder lead-times (mirroring lib/useReminders), and emails a single digest
 * via the Resend HTTP API. Pure Node — no npm dependencies.
 *
 * Because it reads the LAST SYNCED gist, keep the app's auto-sync on (or hit
 * "Sync now") so the gist reflects your latest edits.
 *
 * Required env (set as GitHub Actions secrets):
 *   GIST_ID          the gist id the app created
 *   GIST_TOKEN       a GitHub PAT with the `gist` scope (read the private gist)
 *   RESEND_API_KEY   Resend API key (https://resend.com)
 *   TO_EMAIL         where reminders are sent
 *   FROM_EMAIL       a Resend-verified sender (e.g. "Calendar <cal@yourdomain>")
 * Optional env:
 *   TIMEZONE         IANA tz for "today" (default America/Chicago)
 *   DRY_RUN          "1" to print the digest instead of sending
 *   SEND_WHEN_EMPTY  "1" to send even when nothing is due (default: stay silent)
 *
 * Exit code is 0 on success (including "nothing due"); non-zero only on real
 * errors (bad gist, send failure) so a failed run is visible in the Actions UI.
 */

const GIST_ID = process.env.GIST_ID;
const GIST_TOKEN = process.env.GIST_TOKEN;
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const TO_EMAIL = process.env.TO_EMAIL;
const FROM_EMAIL = process.env.FROM_EMAIL;
const TIMEZONE = process.env.TIMEZONE || "America/Chicago";
const DRY_RUN = process.env.DRY_RUN === "1";
const SEND_WHEN_EMPTY = process.env.SEND_WHEN_EMPTY === "1";

const GIST_FILENAME = "yearly-calendar.json";
const DEFAULT_LEAD_DAYS = [7, 3, 1, 0];

function fail(msg) {
  console.error("ERROR:", msg);
  process.exit(1);
}

// ── Date helpers (UTC-anchored; mirror lib/date-utils) ──────────────────────
function todayInTZ(tz) {
  // en-CA yields YYYY-MM-DD; format "now" in the target timezone.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}
function daysBetween(a, b) {
  const [ay, am, ad] = a.split("-").map(Number);
  const [by, bm, bd] = b.split("-").map(Number);
  return Math.round((Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / 86400000);
}
function toISO(y, m0, d) {
  return `${y}-${String(m0 + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}
function addDaysISO(iso, n) {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1, d + n);
  return toISO(dt.getFullYear(), dt.getMonth(), dt.getDate());
}
function addMonthsISO(iso, n) {
  const [y, m, d] = iso.split("-").map(Number);
  const tmi = m - 1 + n;
  const ty = y + Math.floor(tmi / 12);
  const nm = ((tmi % 12) + 12) % 12;
  const last = new Date(ty, nm + 1, 0).getDate();
  return toISO(ty, nm, Math.min(d, last));
}
function addYearsISO(iso, n) {
  return addMonthsISO(iso, n * 12);
}

// ── Recurrence expansion (mirror lib/recurrence) ────────────────────────────
function stepDate(iso, freq) {
  switch (freq) {
    case "WEEKLY": return addDaysISO(iso, 7);
    case "MONTHLY": return addMonthsISO(iso, 1);
    case "SEMESTER": return addMonthsISO(iso, 6);
    case "YEARLY": return addYearsISO(iso, 1);
    default: return addDaysISO(iso, 7);
  }
}
function occurrenceDone(event, date) {
  if (!event.recurrence) return Boolean(event.completed);
  return Array.isArray(event.completedDates) && event.completedDates.includes(date);
}
function expandEvent(event, rangeStart, rangeEnd) {
  if (!event.recurrence) {
    if (event.date < rangeStart || event.date > rangeEnd) return [];
    return [{ date: event.date, completed: Boolean(event.completed) }];
  }
  const out = [];
  const until = event.recurrence.until;
  const hardEnd = until && until < rangeEnd ? until : rangeEnd;
  let cursor = event.date;
  let guard = 0;
  while (cursor <= hardEnd && guard < 5000) {
    if (cursor >= rangeStart) out.push({ date: cursor, completed: occurrenceDone(event, cursor) });
    cursor = stepDate(cursor, event.recurrence.freq);
    guard++;
  }
  return out;
}

// ── Reminder resolution (mirror lib/useReminders) ───────────────────────────
function resolveLeadTimes(event, labelsById) {
  if (Array.isArray(event.reminderDays)) {
    return event.reminderDays.length === 0 ? null : event.reminderDays;
  }
  const label = labelsById.get(event.category);
  if (!label || !label.remindByDefault) return null;
  return DEFAULT_LEAD_DAYS;
}

// ── Fetch the gist ──────────────────────────────────────────────────────────
async function fetchGist() {
  const res = await fetch(`https://api.github.com/gists/${GIST_ID}`, {
    headers: {
      Authorization: `Bearer ${GIST_TOKEN}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "yearly-calendar-email-reminders",
    },
  });
  if (!res.ok) fail(`Gist fetch failed (HTTP ${res.status}). Check GIST_ID and GIST_TOKEN scope.`);
  const body = await res.json();
  const raw = body.files?.[GIST_FILENAME]?.content;
  if (typeof raw !== "string") fail(`Gist has no '${GIST_FILENAME}' file.`);
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    fail("Gist content is not valid JSON.");
  }
  const events = Array.isArray(parsed.events) ? parsed.events : Array.isArray(parsed) ? parsed : [];
  const labels = Array.isArray(parsed.labels) ? parsed.labels : [];
  return { events, labels };
}

// ── Build the digest ────────────────────────────────────────────────────────
function computeDue(events, labels, today) {
  const labelsById = new Map(labels.map((l) => [l.id, l]));
  const windowEnd = addDaysISO(today, 70);
  const due = [];
  for (const event of events) {
    const leadTimes = resolveLeadTimes(event, labelsById);
    if (!leadTimes) continue;
    for (const occ of expandEvent(event, today, windowEnd)) {
      if (occ.completed) continue;
      const days = daysBetween(today, occ.date);
      if (!leadTimes.includes(days)) continue;
      due.push({
        title: event.title,
        date: occ.date,
        days,
        label: labelsById.get(event.category)?.label || "",
        accent: labelsById.get(event.category)?.accent || "#333",
        description: event.description || "",
        links: Array.isArray(event.links) ? event.links : [],
      });
    }
  }
  // Soonest first, then by title.
  due.sort((a, b) => a.days - b.days || a.title.localeCompare(b.title));
  return due;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
  ));
}

function renderHtml(due, today) {
  const rows = due.map((d) => {
    const when = d.days === 0 ? "today" : `in ${d.days} day${d.days === 1 ? "" : "s"}`;
    const links = d.links
      .map((l) => `<a href="${escapeHtml(l.url)}" style="color:#2563eb;">${escapeHtml(l.label)}</a>`)
      .join(" · ");
    return `
      <tr>
        <td style="padding:8px 10px;border-bottom:1px solid #eee;">
          <span style="display:inline-block;width:10px;height:10px;border-radius:3px;background:${escapeHtml(d.accent)};margin-right:6px;"></span>
          <strong>${escapeHtml(d.title)}</strong>
          ${d.label ? `<span style="color:#888;font-size:12px;"> · ${escapeHtml(d.label)}</span>` : ""}
          <div style="color:#555;font-size:13px;margin-top:2px;">
            ${escapeHtml(d.date)} — <strong>${when}</strong>
            ${d.description ? `<br>${escapeHtml(d.description)}` : ""}
            ${links ? `<br>${links}` : ""}
          </div>
        </td>
      </tr>`;
  }).join("");
  return `<div style="font-family:system-ui,Arial,sans-serif;max-width:560px;">
    <h2 style="margin:0 0 4px;">Upcoming reminders</h2>
    <p style="color:#888;margin:0 0 12px;font-size:13px;">as of ${escapeHtml(today)}</p>
    <table style="width:100%;border-collapse:collapse;">${rows}</table>
    <p style="color:#aaa;font-size:11px;margin-top:16px;">Sent by your Yearly Calendar reminder job.</p>
  </div>`;
}

function renderText(due, today) {
  const lines = due.map((d) => {
    const when = d.days === 0 ? "today" : `in ${d.days}d`;
    const links = d.links.map((l) => `${l.label}: ${l.url}`).join(" | ");
    return `• ${d.title}${d.label ? ` [${d.label}]` : ""} — ${d.date} (${when})` +
      (d.description ? `\n    ${d.description}` : "") +
      (links ? `\n    ${links}` : "");
  });
  return `Upcoming reminders (as of ${today})\n\n${lines.join("\n")}\n`;
}

async function sendEmail(subject, html, text) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: FROM_EMAIL, to: [TO_EMAIL], subject, html, text }),
  });
  if (!res.ok) {
    const b = await res.text();
    fail(`Resend send failed (HTTP ${res.status}): ${b}`);
  }
}

// ── Main ────────────────────────────────────────────────────────────────────
async function main() {
  if (!GIST_ID || !GIST_TOKEN) fail("GIST_ID and GIST_TOKEN are required.");
  if (!DRY_RUN && (!RESEND_API_KEY || !TO_EMAIL || !FROM_EMAIL)) {
    fail("RESEND_API_KEY, TO_EMAIL, and FROM_EMAIL are required (or set DRY_RUN=1).");
  }

  const today = todayInTZ(TIMEZONE);
  const { events, labels } = await fetchGist();
  const due = computeDue(events, labels, today);

  console.log(`today=${today} tz=${TIMEZONE} events=${events.length} due=${due.length}`);

  if (due.length === 0 && !SEND_WHEN_EMPTY) {
    console.log("Nothing due — staying silent (set SEND_WHEN_EMPTY=1 to override).");
    return;
  }

  const subject =
    due.length === 0
      ? "Calendar: nothing due today"
      : `Calendar: ${due.length} reminder${due.length === 1 ? "" : "s"} — ${
          due[0].days === 0 ? "due today" : `next in ${due[0].days}d`
        }`;
  const html = renderHtml(due, today);
  const text = renderText(due, today);

  if (DRY_RUN) {
    console.log("--- DRY RUN (not sending) ---");
    console.log("Subject:", subject);
    console.log(text);
    return;
  }

  await sendEmail(subject, html, text);
  console.log(`Sent digest with ${due.length} reminder(s) to ${TO_EMAIL}.`);
}

main().catch((e) => fail(e instanceof Error ? e.message : String(e)));
