"use client";

import { useEffect, useState } from "react";
import { X, Plus, Trash2, ArrowUp, ArrowDown, Bell, BellOff, RotateCcw, Tag } from "lucide-react";
import type { Label } from "@/lib/types";
import { ConfirmDialog } from "./ConfirmDialog";

interface Props {
  labels: Label[];
  /** Count of events per label id, to warn before deleting a used label. */
  usageById: Map<string, number>;
  onAdd: (draft: Omit<Label, "id" | "priority">) => void;
  onUpdate: (id: string, patch: Partial<Omit<Label, "id">>) => void;
  onDelete: (id: string) => void;
  onMove: (id: string, dir: -1 | 1) => void;
  onReset: () => void;
  onClose: () => void;
}

/**
 * Curated color palette (Google-Calendar style). Each swatch pairs a light
 * `bg` tint (used to fill chips/cells) with a bold `accent` (borders/text), so
 * picking one swatch sets both — no fiddly hex picking.
 */
export const LABEL_PALETTE: { name: string; bg: string; accent: string }[] = [
  { name: "Tomato",     bg: "#FBD5D0", accent: "#D50000" },
  { name: "Tangerine",  bg: "#FCE0C7", accent: "#E8730C" },
  { name: "Banana",     bg: "#FDECC8", accent: "#B58A00" },
  { name: "Sage",       bg: "#D9EAD3", accent: "#3B8046" },
  { name: "Basil",      bg: "#CDE7D8", accent: "#0B7A5B" },
  { name: "Peacock",    bg: "#CFE9EC", accent: "#009BA6" },
  { name: "Blueberry",  bg: "#D6E2F7", accent: "#1B4FCC" },
  { name: "Lavender",   bg: "#E1E0F7", accent: "#5B5BD6" },
  { name: "Grape",      bg: "#EBD7F5", accent: "#8E24AA" },
  { name: "Flamingo",   bg: "#F7DAE6", accent: "#C2185B" },
  { name: "Graphite",   bg: "#E2E4E8", accent: "#4A5568" },
  { name: "Cocoa",      bg: "#E7DCCF", accent: "#795548" },
];

const DEFAULT_SWATCH = LABEL_PALETTE[6]; // Blueberry

/**
 * Modal for creating, recoloring, reordering, and deleting user labels.
 * Deleting a label that is still used prompts first (the events keep their id and
 * render via the neutral fallback until reassigned).
 */
export function LabelManager({
  labels,
  usageById,
  onAdd,
  onUpdate,
  onDelete,
  onMove,
  onReset,
  onClose,
}: Props) {
  const [pendingDelete, setPendingDelete] = useState<Label | null>(null);
  const [newName, setNewName] = useState("");

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !pendingDelete) onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose, pendingDelete]);

  const addNew = () => {
    const name = newName.trim();
    if (!name) return;
    // Rotate through the palette so consecutive new labels get distinct colors.
    const swatch = LABEL_PALETTE[labels.length % LABEL_PALETTE.length] ?? DEFAULT_SWATCH;
    onAdd({ label: name, bg: swatch.bg, accent: swatch.accent, remindByDefault: false });
    setNewName("");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Manage labels">
      <div className="absolute inset-0 animate-fade-in bg-ink/40 backdrop-blur-[2px]" onClick={onClose} aria-hidden="true" />

      <div className="relative flex max-h-[85vh] w-full max-w-lg animate-scale-in flex-col rounded-2xl bg-surface shadow-pop">
        <header className="flex items-center justify-between border-b border-line px-5 py-3.5">
          <div className="flex items-center gap-2">
            <Tag className="h-5 w-5 text-brand" />
            <h2 className="font-display text-base font-semibold text-ink">Manage labels</h2>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-muted transition-colors hover:bg-canvas hover:text-ink" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </header>

        {/* Add row */}
        <div className="flex items-center gap-2 border-b border-line px-5 py-3">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addNew();
              }
            }}
            placeholder="New label name…"
            className="min-w-0 flex-1 rounded-lg border border-line bg-canvas/50 px-2.5 py-1.5 text-sm text-ink focus:border-brand focus:bg-surface focus:outline-none"
          />
          <button
            onClick={addNew}
            disabled={!newName.trim()}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-sm font-semibold text-white shadow-soft transition-colors hover:brightness-110 disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            Add
          </button>
        </div>

        {/* Label list */}
        <div className="thin-scroll flex-1 overflow-y-auto px-3 py-3">
          {labels.length === 0 ? (
            <div className="px-2 py-8 text-center text-sm text-muted">
              No labels yet. Add one above to start color-coding events.
            </div>
          ) : (
            <ul className="space-y-2">
              {labels.map((l, idx) => {
                const used = usageById.get(l.id) ?? 0;
                return (
                  <li key={l.id} className="rounded-xl border border-line bg-surface p-2.5 shadow-soft">
                    <div className="flex items-center gap-2">
                      {/* Color preview */}
                      <span
                        className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[10px] font-bold"
                        style={{ backgroundColor: l.bg, color: l.accent, border: `1.5px solid ${l.accent}` }}
                      >
                        Aa
                      </span>
                      <input
                        value={l.label}
                        onChange={(e) => onUpdate(l.id, { label: e.target.value })}
                        className="min-w-0 flex-1 rounded-lg border border-transparent bg-transparent px-1.5 py-1 text-sm font-semibold text-ink hover:border-line focus:border-brand focus:bg-canvas/50 focus:outline-none"
                      />
                      <div className="flex shrink-0 items-center gap-1">
                        <button
                          onClick={() => onMove(l.id, -1)}
                          disabled={idx === 0}
                          className="rounded-lg p-1 text-muted transition-colors hover:bg-canvas hover:text-ink disabled:opacity-30"
                          title="Move up (higher priority)"
                          aria-label="Move up"
                        >
                          <ArrowUp className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => onMove(l.id, 1)}
                          disabled={idx === labels.length - 1}
                          className="rounded-lg p-1 text-muted transition-colors hover:bg-canvas hover:text-ink disabled:opacity-30"
                          title="Move down"
                          aria-label="Move down"
                        >
                          <ArrowDown className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => (used > 0 ? setPendingDelete(l) : onDelete(l.id))}
                          className="rounded-lg p-1 text-muted transition-colors hover:bg-red-50 hover:text-red-600"
                          title="Delete label"
                          aria-label="Delete label"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-3 pl-9 text-xs">
                      <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Label color">
                        {LABEL_PALETTE.map((sw) => {
                          const selected = eqHex(l.accent, sw.accent) && eqHex(l.bg, sw.bg);
                          return (
                            <button
                              key={sw.accent}
                              type="button"
                              onClick={() => onUpdate(l.id, { bg: sw.bg, accent: sw.accent })}
                              title={sw.name}
                              aria-label={sw.name}
                              aria-pressed={selected}
                              className={
                                "h-5 w-5 rounded-full transition-transform hover:scale-110 " +
                                (selected ? "ring-2 ring-offset-1 ring-ink/60" : "")
                              }
                              style={{ backgroundColor: sw.accent }}
                            />
                          );
                        })}
                      </div>
                      <button
                        onClick={() => onUpdate(l.id, { remindByDefault: !l.remindByDefault })}
                        className={
                          "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-medium transition-colors " +
                          (l.remindByDefault
                            ? "border-brand/30 bg-brand-soft text-brand"
                            : "border-line text-muted hover:bg-canvas")
                        }
                        title="Fire the default reminder schedule (7, 3, 1, day-of) for events with this label"
                      >
                        {l.remindByDefault ? <Bell className="h-3 w-3" /> : <BellOff className="h-3 w-3" />}
                        Auto-remind
                      </button>
                      {used > 0 && <span className="text-muted">· {used} event{used === 1 ? "" : "s"}</span>}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <footer className="flex items-center justify-between border-t border-line px-5 py-3">
          <button
            onClick={onReset}
            className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm text-muted transition-colors hover:bg-canvas hover:text-ink"
            title="Clear all labels"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Clear all
          </button>
          <button
            onClick={onClose}
            className="rounded-lg bg-brand px-4 py-1.5 text-sm font-semibold text-white shadow-soft transition-colors hover:brightness-110"
          >
            Done
          </button>
        </footer>
      </div>

      {pendingDelete && (
        <ConfirmDialog
          title="Delete this label?"
          message={
            `"${pendingDelete.label}" is used by ${usageById.get(pendingDelete.id) ?? 0} event(s).\n` +
            `Deleting it keeps those events, but they'll show as "Unlabeled" until you assign a new label.`
          }
          confirmLabel="Delete label"
          destructive
          onCancel={() => setPendingDelete(null)}
          onConfirm={() => {
            onDelete(pendingDelete.id);
            setPendingDelete(null);
          }}
        />
      )}
    </div>
  );
}

/** Case-insensitive hex compare, tolerant of surrounding whitespace. */
function eqHex(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}
