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
    <div className="mb-5 flex flex-wrap items-center gap-2 rounded-2xl border border-line bg-surface p-2.5 shadow-soft">
      <div className="relative min-w-[180px] flex-1">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        <input
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          placeholder="Search title or description…"
          className="w-full rounded-xl border border-line bg-canvas/50 py-1.5 pl-8 pr-2 text-sm text-ink placeholder:text-muted focus:border-brand focus:bg-surface focus:outline-none"
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
                "rounded-full border px-2.5 py-1 text-[11px] font-medium transition-all " +
                (active ? "text-white shadow-soft" : "text-ink/70 hover:brightness-95")
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
          <span className="text-xs font-medium text-muted">
            {matchCount} match{matchCount === 1 ? "" : "es"}
          </span>
          <button
            onClick={onClear}
            className="inline-flex items-center gap-1 rounded-lg border border-line px-2 py-1 text-xs text-ink/70 transition-colors hover:bg-canvas"
          >
            <X className="h-3 w-3" />
            Clear
          </button>
        </div>
      )}
    </div>
  );
}
