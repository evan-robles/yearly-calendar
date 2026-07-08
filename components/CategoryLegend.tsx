"use client";

import { useState } from "react";
import { ChevronDown, Settings2, Tag } from "lucide-react";
import type { Label } from "@/lib/types";

interface Props {
  labels: Label[];
  onManage: () => void;
}

export function CategoryLegend({ labels, onManage }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-1.5 text-sm text-ink/80 shadow-soft transition-colors hover:bg-canvas hover:text-ink"
      >
        Legend
        <ChevronDown className={"h-3.5 w-3.5 transition-transform " + (open ? "rotate-180" : "")} />
      </button>

      {open && (
        <div
          className="absolute right-0 z-20 mt-1.5 w-64 animate-scale-in rounded-xl border border-line bg-surface p-2 shadow-pop"
          onMouseLeave={() => setOpen(false)}
        >
          {labels.length === 0 ? (
            <div className="px-2 py-3 text-center text-xs text-muted">
              No labels yet. Create some to color-code your events.
            </div>
          ) : (
            <ul className="space-y-0.5">
              {labels.map((cat) => (
                <li key={cat.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-canvas">
                  <span
                    className="inline-block h-3 w-3 rounded"
                    style={{ backgroundColor: cat.bg, border: `1px solid ${cat.accent}` }}
                  />
                  <span className="font-semibold text-ink">{cat.label}</span>
                </li>
              ))}
            </ul>
          )}
          <button
            onClick={() => {
              setOpen(false);
              onManage();
            }}
            className="mt-1 flex w-full items-center gap-2 rounded-lg border-t border-line px-2 py-2 text-sm font-medium text-brand hover:bg-brand-soft/40"
          >
            <Settings2 className="h-4 w-4" />
            Manage labels
          </button>
        </div>
      )}
    </div>
  );
}

/** Tiny inline icon-y export kept for potential reuse; not required. */
export const LegendIcon = Tag;
