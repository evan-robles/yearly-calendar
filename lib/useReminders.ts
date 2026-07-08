"use client";

import { useCallback, useEffect, useState } from "react";
import type { CalendarEvent, CategoryId } from "./types";
import { todayISO, daysBetween, addDaysISO } from "./date-utils";
import { expandEvent } from "./recurrence";

const PREF_KEY = "yearly-calendar:reminders:v1";
const SHOWN_KEY = "yearly-calendar:reminders:shown:v1";

/** Categories whose events get reminders by default (when reminderDays is unset). */
const DEFAULT_REMINDER_CATEGORIES: CategoryId[] = ["DEADLINE", "MILESTONE", "UCHICAGO"];

/** Default lead times (days) for events without an override. 0 = day of. */
export const DEFAULT_LEAD_DAYS = [7, 3, 1, 0];

/** Lead-time options exposed in the per-event reminder picker. */
export const LEAD_TIME_OPTIONS = [60, 30, 14, 7, 3, 1, 0];

const SWEEP_INTERVAL_MS = 60_000;

// Look-ahead window for expanding recurring events when sweeping for reminders.
// The longest default/optional lead time is 60 days, so 70 gives comfortable margin.
const REMINDER_LOOKAHEAD_DAYS = 70;

/** Resolve the lead-time list for one event. null = no reminders for this event. */
function resolveLeadTimes(event: CalendarEvent): number[] | null {
  if (event.reminderDays !== undefined) {
    return event.reminderDays.length === 0 ? null : event.reminderDays;
  }
  if (!DEFAULT_REMINDER_CATEGORIES.includes(event.category)) return null;
  return DEFAULT_LEAD_DAYS;
}

export function useReminders(events: CalendarEvent[], hydrated: boolean) {
  const [enabled, setEnabled] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [supported, setSupported] = useState(true);
  const [tick, setTick] = useState(0);

  // Hydrate.
  useEffect(() => {
    if (typeof Notification === "undefined") {
      setSupported(false);
      return;
    }
    setPermission(Notification.permission);
    try {
      const raw = localStorage.getItem(PREF_KEY);
      if (raw) setEnabled(Boolean(JSON.parse(raw)?.enabled));
    } catch {
      // ignore
    }
  }, []);

  // Persist preference.
  useEffect(() => {
    try {
      localStorage.setItem(PREF_KEY, JSON.stringify({ enabled }));
    } catch {
      // ignore
    }
  }, [enabled]);

  // Re-sweep every minute so a long-open tab still notifies on threshold crossings.
  useEffect(() => {
    if (!enabled || !supported) return;
    const id = window.setInterval(() => setTick((t) => t + 1), SWEEP_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [enabled, supported]);

  // Sweep events and fire notifications when "days from today to event" hits a lead-time.
  useEffect(() => {
    if (!hydrated || !enabled || !supported) return;
    if (Notification.permission !== "granted") return;

    const today = todayISO();
    let shown: Record<string, string>;
    try {
      shown = JSON.parse(localStorage.getItem(SHOWN_KEY) || "{}");
    } catch {
      shown = {};
    }

    const windowEnd = addDaysISO(today, REMINDER_LOOKAHEAD_DAYS);

    let changed = false;
    for (const event of events) {
      const leadTimes = resolveLeadTimes(event);
      if (!leadTimes) continue;

      // Expand recurring events into upcoming occurrences; a non-recurring event
      // yields at most one. Only occurrences from today forward can fire.
      const occurrences = expandEvent(event, today, windowEnd);
      for (const occ of occurrences) {
        if (occ.completed) continue;

        const days = daysBetween(today, occ.date);
        if (!leadTimes.includes(days)) continue;

        // Key includes the occurrence date so distinct occurrences of a series
        // are tracked independently.
        const key = `${event.id}:${occ.date}:${days}`;
        if (shown[key] === today) continue;

        const title =
          days === 0
            ? `Today: ${event.title}`
            : `${event.title} — in ${days} day${days === 1 ? "" : "s"}`;
        const body = event.description?.slice(0, 200) || `${event.category} on ${occ.date}`;
        try {
          const n = new Notification(title, { body, tag: key });
          n.onclick = () => {
            window.focus();
            n.close();
          };
        } catch (err) {
          console.warn("Notification failed:", err);
        }
        shown[key] = today;
        changed = true;
      }
    }

    if (changed) {
      try {
        localStorage.setItem(SHOWN_KEY, JSON.stringify(shown));
      } catch {
        // ignore
      }
    }
  }, [events, hydrated, enabled, supported, tick]);

  const requestPermission = useCallback(async () => {
    if (!supported) return false;
    const perm =
      Notification.permission === "default"
        ? await Notification.requestPermission()
        : Notification.permission;
    setPermission(perm);
    return perm === "granted";
  }, [supported]);

  const toggle = useCallback(async () => {
    if (!supported) {
      alert("Your browser doesn't support notifications.");
      return;
    }
    if (enabled) {
      setEnabled(false);
      return;
    }
    const granted = await requestPermission();
    if (!granted) {
      alert(
        "Notifications were blocked. Allow them in your browser settings to use reminders.\n\nLook for a 🔔 or lock icon in the address bar."
      );
      return;
    }
    setEnabled(true);
  }, [enabled, requestPermission, supported]);

  /**
   * Test notification with diagnostics. The most common reason a notification
   * "doesn't appear" on macOS isn't the browser — it's macOS itself silencing
   * it. We fire the notification, then ask the user if they saw it; if not,
   * we surface OS-level troubleshooting.
   */
  const testNotification = useCallback(async () => {
    if (!supported) {
      alert("Your browser doesn't support the Notifications API.");
      return;
    }
    if (Notification.permission === "denied") {
      alert(
        "This site is blocked from showing notifications.\n\n" +
          "Click the 🔔 / lock icon in the address bar, allow notifications, then reload the page."
      );
      return;
    }
    if (Notification.permission !== "granted") {
      const ok = await requestPermission();
      if (!ok) {
        alert("Notification permission was not granted — can't send a test.");
        return;
      }
    }

    try {
      const n = new Notification("Test reminder ✓", {
        body: "If you can see this, reminders are working. Click to dismiss.",
        tag: "yearly-calendar-test",
      });
      n.onclick = () => {
        window.focus();
        n.close();
      };
      n.onerror = (e) => {
        console.error("Notification error event:", e);
      };
    } catch (err) {
      console.error("Notification constructor threw:", err);
      alert(
        `Failed to create notification:\n\n${err instanceof Error ? err.message : String(err)}`
      );
      return;
    }

    // Verify with the user after a moment so they can confirm visibility.
    window.setTimeout(() => {
      const seen = confirm(
        "A test notification was just fired.\n\nDid it appear on your screen?\n\n" +
          "OK = Yes, I saw it\n" +
          "Cancel = No, troubleshoot"
      );
      if (!seen) {
        const isMac = /Mac/i.test(navigator.platform);
        const ua = navigator.userAgent;
        const browser = /Edg\//.test(ua)
          ? "Microsoft Edge"
          : /Chrome/.test(ua)
            ? "Google Chrome"
            : /Firefox/.test(ua)
              ? "Firefox"
              : /Safari/.test(ua)
                ? "Safari"
                : "your browser";
        alert(
          `If you didn't see the notification, the most common causes:\n\n` +
            (isMac
              ? `1. macOS is silencing it. Open System Settings → Notifications → ${browser}. "Allow Notifications" must be ON and "Banner style" must be Banners or Alerts (not None).\n\n` +
                `2. Focus or Do Not Disturb is on. Check Control Center (top-right of menu bar).\n\n` +
                `3. Some notifications go straight to Notification Center silently. Swipe down from the top-right corner of the screen to see if it's there.\n\n`
              : `1. The OS notification setting for ${browser} is off or set to silent.\n\n` +
                `2. Focus / Do Not Disturb / Quiet Hours is on.\n\n`) +
            `4. ${browser} blocked notifications for this site. Click the 🔔 / lock icon in the address bar to verify.\n\n` +
            `Permission state right now: ${Notification.permission}`
        );
      }
    }, 1500);
  }, [supported, requestPermission]);

  return { enabled, permission, supported, toggle, testNotification };
}
