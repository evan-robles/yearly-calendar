"use client";

import { useState } from "react";
import { ChevronDown, Keyboard } from "lucide-react";

/** A single keyboard-shortcut row: one-or-more <kbd> keys + a description. */
interface Shortcut {
  keys: string[];
  label: string;
}

const SHORTCUTS: Shortcut[] = [
  { keys: ["←", "→"], label: "Previous / next year" },
  { keys: ["⇧", "←", "→"], label: "Focus previous / next day" },
  { keys: ["⇧", "↑", "↓"], label: "Focus previous / next week" },
  { keys: ["↵"], label: "Open the focused day" },
  { keys: ["Esc"], label: "Close drawer / dialog" },
];

export function ShortcutsLegend() {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-1.5 text-sm text-ink/80 shadow-soft transition-colors hover:bg-canvas hover:text-ink"
      >
        <Keyboard className="h-3.5 w-3.5" />
        Shortcuts
        <ChevronDown className={"h-3.5 w-3.5 transition-transform " + (open ? "rotate-180" : "")} />
      </button>

      {open && (
        <div
          className="absolute right-0 z-20 mt-1.5 w-72 animate-scale-in rounded-xl border border-line bg-surface p-2 shadow-pop"
          onMouseLeave={() => setOpen(false)}
        >
          <ul className="space-y-0.5">
            {SHORTCUTS.map((s) => (
              <li
                key={s.label}
                className="flex items-center justify-between gap-3 rounded-lg px-2 py-1.5 text-sm hover:bg-canvas"
              >
                <span className="text-ink/90">{s.label}</span>
                <span className="flex shrink-0 items-center gap-1">
                  {s.keys.map((k, i) => (
                    <kbd
                      key={i}
                      className="inline-flex h-5 min-w-5 items-center justify-center rounded border border-line bg-canvas px-1.5 font-mono text-[11px] font-semibold text-ink/70 shadow-soft"
                    >
                      {k}
                    </kbd>
                  ))}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-1 border-t border-line px-2 py-2 text-[11px] leading-snug text-muted">
            Hold <kbd className="inline-flex h-4 items-center rounded border border-line bg-canvas px-1 font-mono text-[10px] text-ink/70">⇧</kbd> and an arrow to move the highlighted day, then press <kbd className="inline-flex h-4 items-center rounded border border-line bg-canvas px-1 font-mono text-[10px] text-ink/70">↵</kbd> to open it.
          </p>
        </div>
      )}
    </div>
  );
}
