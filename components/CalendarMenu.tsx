"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { CalendarDays, ChevronDown, Download, Upload, X, CalendarCheck } from "lucide-react";
import type { CalendarEvent, Label } from "@/lib/types";
import { eventsToICS, parseICS, type ParsedEvent } from "@/lib/ics";

interface Props {
  events: CalendarEvent[];
  labels: Label[];
  getLabel: (id: string) => Label;
  /** Bulk-add imported events (each already stamped with a chosen label id). */
  onImport: (drafts: Omit<CalendarEvent, "id" | "updatedAt">[]) => void;
  /** Create a label (used by "Create Imported label"); returns nothing. */
  onCreateImportedLabel: () => string; // returns the new label id
}

export function CalendarMenu({ events, labels, getLabel, onImport, onCreateImportedLabel }: Props) {
  const [open, setOpen] = useState(false);
  const [parsed, setParsed] = useState<ParsedEvent[] | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (!t.closest("[data-calendar-menu]")) setOpen(false);
    };
    window.addEventListener("mousedown", handler);
    return () => window.removeEventListener("mousedown", handler);
  }, [open]);

  const handleExport = () => {
    setOpen(false);
    const now = new Date();
    const ics = eventsToICS(events, getLabel, now.toISOString());
    const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `yearly-calendar-${now.toISOString().slice(0, 10)}.ics`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportClick = () => {
    setOpen(false);
    fileRef.current?.click();
  };

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const events = parseICS(text);
      if (events.length === 0) {
        alert("No importable events found in that .ics file.");
      } else {
        setParsed(events);
      }
    } catch (err) {
      alert("Couldn't read that .ics file.\n\n" + (err instanceof Error ? err.message : "Unknown error"));
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div className="relative" data-calendar-menu>
      <button
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-1.5 text-sm text-ink/80 shadow-soft transition-colors hover:bg-canvas hover:text-ink"
        title="Import or export a calendar (.ics)"
      >
        <CalendarDays className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Calendar</span>
        <ChevronDown className={"h-3.5 w-3.5 transition-transform " + (open ? "rotate-180" : "")} />
      </button>

      {open && (
        <div className="absolute right-0 z-30 mt-1.5 w-72 animate-scale-in overflow-hidden rounded-xl border border-line bg-surface shadow-pop">
          <button
            onClick={handleExport}
            className="flex w-full items-start gap-2 px-3 py-2.5 text-left text-sm transition-colors hover:bg-canvas"
          >
            <Download className="mt-0.5 h-4 w-4 shrink-0 text-muted" />
            <div>
              <div className="font-medium text-ink">Export to calendar (.ics)</div>
              <div className="text-xs text-muted">
                Download {events.length} event{events.length === 1 ? "" : "s"} to import into Google / Apple
                Calendar — reminders included.
              </div>
            </div>
          </button>
          <button
            onClick={handleImportClick}
            className="flex w-full items-start gap-2 border-t border-line px-3 py-2.5 text-left text-sm transition-colors hover:bg-canvas"
          >
            <Upload className="mt-0.5 h-4 w-4 shrink-0 text-muted" />
            <div>
              <div className="font-medium text-ink">Import from .ics</div>
              <div className="text-xs text-muted">Add events from a calendar file.</div>
            </div>
          </button>
        </div>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="text/calendar,.ics"
        onChange={handleFileChange}
        className="hidden"
      />

      {parsed && (
        <ImportDialog
          parsed={parsed}
          labels={labels}
          onCancel={() => setParsed(null)}
          onConfirm={(labelId) => {
            const drafts = parsed.map((p) => ({
              date: p.date,
              category: labelId,
              title: p.title,
              description: p.description,
              completed: false,
              recurrence: p.recurrence,
              links: p.url ? [{ label: "Link", url: p.url }] : undefined,
            }));
            onImport(drafts);
            setParsed(null);
          }}
          onCreateImportedLabel={onCreateImportedLabel}
        />
      )}
    </div>
  );
}

function ImportDialog({
  parsed,
  labels,
  onCancel,
  onConfirm,
  onCreateImportedLabel,
}: {
  parsed: ParsedEvent[];
  labels: Label[];
  onCancel: () => void;
  onConfirm: (labelId: string) => void;
  onCreateImportedLabel: () => string;
}) {
  const [labelId, setLabelId] = useState<string>(labels[0]?.id ?? "");

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onCancel]);

  const confirm = () => {
    // If no labels exist (or user chose to), create an "Imported" label first.
    const id = labelId && labels.some((l) => l.id === labelId) ? labelId : onCreateImportedLabel();
    onConfirm(id);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 animate-fade-in bg-ink/40 backdrop-blur-[2px]" onClick={onCancel} aria-hidden="true" />
      <div className="relative w-full max-w-md animate-scale-in rounded-2xl bg-surface shadow-pop">
        <header className="flex items-center justify-between border-b border-line px-4 py-3">
          <div className="flex items-center gap-2">
            <CalendarCheck className="h-5 w-5 text-brand" />
            <h2 className="font-display text-base font-semibold text-ink">Import calendar</h2>
          </div>
          <button onClick={onCancel} className="rounded-lg p-1 text-muted transition-colors hover:bg-canvas hover:text-ink" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="space-y-3 p-4 text-sm">
          <div className="rounded-xl border border-brand/20 bg-brand-soft/40 p-3">
            <div className="font-semibold text-ink">
              {parsed.length} event{parsed.length === 1 ? "" : "s"} found
            </div>
            <div className="mt-1 max-h-24 overflow-y-auto text-xs text-muted">
              {parsed.slice(0, 6).map((p, i) => (
                <div key={i} className="truncate">
                  {p.date} · {p.title}
                </div>
              ))}
              {parsed.length > 6 && <div>…and {parsed.length - 6} more</div>}
            </div>
          </div>

          <label className="block">
            <span className="block text-[11px] font-semibold uppercase tracking-wider text-muted">
              Assign to label
            </span>
            {labels.length > 0 ? (
              <select
                value={labelId}
                onChange={(e) => setLabelId(e.target.value)}
                className="mt-0.5 w-full rounded-lg border border-line bg-surface px-2.5 py-1.5 text-sm text-ink focus:border-brand focus:outline-none"
              >
                {labels.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.label}
                  </option>
                ))}
                <option value="__new_imported__">＋ Create an “Imported” label</option>
              </select>
            ) : (
              <p className="mt-1 text-xs text-muted">
                No labels yet — an “Imported” label will be created automatically.
              </p>
            )}
          </label>
        </div>

        <footer className="flex items-center justify-end gap-2 border-t border-line px-4 py-3">
          <button onClick={onCancel} className="rounded-lg px-3 py-1.5 text-sm text-ink/70 transition-colors hover:bg-canvas">
            Cancel
          </button>
          <button
            onClick={confirm}
            className="rounded-lg bg-brand px-3.5 py-1.5 text-sm font-semibold text-white shadow-soft transition-colors hover:brightness-110"
          >
            Import {parsed.length}
          </button>
        </footer>
      </div>
    </div>
  );
}
