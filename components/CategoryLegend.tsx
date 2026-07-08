"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { CATEGORY_LIST } from "@/lib/types";

export function CategoryLegend() {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1.5 rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm text-neutral-700 hover:bg-neutral-100"
      >
        Legend
        <ChevronDown className={"h-3.5 w-3.5 transition-transform " + (open ? "rotate-180" : "")} />
      </button>

      {open && (
        <div
          className="absolute right-0 z-20 mt-1 w-64 rounded-md border border-neutral-200 bg-white p-2 shadow-lg"
          onMouseLeave={() => setOpen(false)}
        >
          <ul className="space-y-1">
            {CATEGORY_LIST.map((cat) => (
              <li key={cat.id} className="flex items-center gap-2 px-1.5 py-1 text-sm">
                <span
                  className="inline-block h-3 w-3 rounded-sm"
                  style={{ backgroundColor: cat.bg, border: `1px solid ${cat.accent}` }}
                />
                <span className="font-medium text-neutral-800">{cat.id}</span>
                <span className="text-neutral-500">— {cat.label}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
