"use client";

import { Search, X } from "lucide-react";
import { CATEGORY_LIST, type CategoryId } from "@/lib/types";

interface Props {
  query: string;
  onQuery: (q: string) => void;
  /** Set of active category ids. Empty set = show all. */
  activeCategories: Set<CategoryId>;
  onToggleCategory: (id: CategoryId) => void;
  onClear: () => void;
  /** Number of events currently matching (across all visible years). */
  matchCount: number;
  /** True when any filter is active. */
  filtering: boolean;
}

/**
 * Search box + category toggles. Filtering is non-destructive — it only changes
 * which events render; the underlying data is untouched.
 */
export function FilterBar({
  query,
  onQuery,
  activeCategories,
  onToggleCategory,
  onClear,
  matchCount,
  filtering,
}: Props) {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-2 rounded-md border border-neutral-200 bg-white p-2">
      <div className="relative flex-1 min-w-[180px]">
        <Search className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
        <input
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          placeholder="Search title or description…"
          className="w-full rounded-md border border-neutral-300 py-1.5 pl-8 pr-2 text-sm focus:border-neutral-500 focus:outline-none"
        />
      </div>

      <div className="flex flex-wrap items-center gap-1">
        {CATEGORY_LIST.map((c) => {
          const active = activeCategories.has(c.id);
          return (
            <button
              key={c.id}
              onClick={() => onToggleCategory(c.id)}
              className={
                "rounded-full border px-2 py-0.5 text-[11px] font-medium transition-colors " +
                (active ? "text-white" : "text-neutral-600 hover:bg-neutral-50")
              }
              style={
                active
                  ? { backgroundColor: c.accent, borderColor: c.accent }
                  : { borderColor: c.bg, backgroundColor: c.bg + "40" }
              }
              title={c.label}
            >
              {c.label}
            </button>
          );
        })}
      </div>

      {filtering && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-neutral-500">
            {matchCount} match{matchCount === 1 ? "" : "es"}
          </span>
          <button
            onClick={onClear}
            className="inline-flex items-center gap-1 rounded-md border border-neutral-300 px-2 py-1 text-xs text-neutral-600 hover:bg-neutral-100"
          >
            <X className="h-3 w-3" />
            Clear
          </button>
        </div>
      )}
    </div>
  );
}
