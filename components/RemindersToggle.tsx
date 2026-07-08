"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff, BellRing, ChevronDown, Check } from "lucide-react";

interface Props {
  enabled: boolean;
  permission: NotificationPermission;
  supported: boolean;
  onToggle: () => void;
  onTest: () => void;
}

export function RemindersToggle({ enabled, permission, supported, onToggle, onTest }: Props) {
  const [open, setOpen] = useState(false);

  // Click-away to close.
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-reminders]")) setOpen(false);
    };
    window.addEventListener("mousedown", handler);
    return () => window.removeEventListener("mousedown", handler);
  }, [open]);

  const active = enabled && permission === "granted";
  const Icon = active ? BellRing : BellOff;

  return (
    <div className="relative" data-reminders>
      <button
        onClick={() => setOpen((o) => !o)}
        className={
          "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm shadow-soft transition-colors " +
          (active
            ? "border-brand/30 bg-brand-soft text-brand hover:brightness-95"
            : "border-line bg-surface text-ink/80 hover:bg-canvas hover:text-ink")
        }
        title="Get desktop notifications for upcoming deadlines"
      >
        <Icon className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Reminders{active ? " on" : ""}</span>
        <ChevronDown className={"h-3.5 w-3.5 transition-transform " + (open ? "rotate-180" : "")} />
      </button>

      {open && (
        <div className="absolute right-0 z-30 mt-1.5 w-80 animate-scale-in overflow-hidden rounded-xl border border-line bg-surface shadow-pop">
          <div className="border-b border-neutral-100 px-3 py-2 text-xs leading-snug text-neutral-600">
            {!supported && (
              <p>Your browser doesn't support notifications. Try Chrome, Firefox, Edge, or Safari.</p>
            )}
            {supported && permission === "denied" && (
              <p>
                Notifications are blocked in your browser. Click the 🔔 / lock icon in the
                address bar and allow notifications, then come back here.
              </p>
            )}
            {supported && permission !== "denied" && (
              <p>
                Get a desktop notification when a <strong>Deadline</strong>,{" "}
                <strong>Milestone</strong>, or <strong>UChicago</strong> event is{" "}
                <strong>7, 3, 1, or 0 days</strong> away. Reminders fire while this tab is open.
              </p>
            )}
          </div>

          <button
            onClick={() => {
              onToggle();
              setOpen(false);
            }}
            disabled={!supported || permission === "denied"}
            className="flex w-full items-center justify-between px-3 py-2.5 text-left text-sm hover:bg-neutral-100 disabled:cursor-not-allowed disabled:bg-neutral-50 disabled:text-neutral-400"
          >
            <span className="font-medium">
              {enabled ? "Turn off reminders" : "Turn on reminders"}
            </span>
            {active && <Check className="h-4 w-4 text-blue-600" />}
          </button>

          {active && (
            <button
              onClick={() => {
                onTest();
                setOpen(false);
              }}
              className="flex w-full items-center gap-2 border-t border-neutral-100 px-3 py-2.5 text-sm text-neutral-700 hover:bg-neutral-100"
            >
              <Bell className="h-3.5 w-3.5 text-neutral-500" />
              Send a test notification
            </button>
          )}
        </div>
      )}
    </div>
  );
}
