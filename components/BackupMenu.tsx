"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { Database, Download, Upload, ChevronDown, X, AlertTriangle, FileJson } from "lucide-react";
import type { CalendarEvent } from "@/lib/types";
import { validateEvents } from "@/lib/validation";

const BACKUP_FORMAT = "yearly-calendar-backup";
const BACKUP_VERSION = 1;

interface BackupFile {
  format: string;
  version: number;
  exportedAt: string;
  events: CalendarEvent[];
}

interface Props {
  events: CalendarEvent[];
  onReplace: (events: CalendarEvent[]) => void;
  onMerge: (events: CalendarEvent[]) => void;
}

export function BackupMenu({ events, onReplace, onMerge }: Props) {
  const [open, setOpen] = useState(false);
  const [parsed, setParsed] = useState<{ events: CalendarEvent[]; exportedAt?: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Click-away to close.
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-backup-menu]")) setOpen(false);
    };
    window.addEventListener("mousedown", handler);
    return () => window.removeEventListener("mousedown", handler);
  }, [open]);

  // ── Export ───────────────────────────────────────────────────────────────
  const handleExport = () => {
    setOpen(false);
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10);
    const timeStr = now.toTimeString().slice(0, 5).replace(":", "");
    const backup: BackupFile = {
      format: BACKUP_FORMAT,
      version: BACKUP_VERSION,
      exportedAt: now.toISOString(),
      events,
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `yearly-calendar-backup-${dateStr}-${timeStr}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // ── Import (file picker → validate → confirm dialog) ─────────────────────
  const handleRestoreClick = () => {
    setOpen(false);
    fileRef.current?.click();
  };

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const obj = JSON.parse(text);
      const importedEvents = validateEvents(obj, new Date().toISOString());
      const exportedAt = obj?.exportedAt as string | undefined;
      setParsed({ events: importedEvents, exportedAt });
    } catch (err) {
      alert(
        "Couldn't read that file as a backup.\n\n" +
        (err instanceof Error ? err.message : "Unknown error")
      );
    } finally {
      // Reset the file input so the user can pick the same file again later.
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div className="relative" data-backup-menu>
      <button
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1.5 rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm text-neutral-700 hover:bg-neutral-100"
        title="Download a backup of your events, or restore from one"
      >
        <Database className="h-3.5 w-3.5" />
        Backup
        <ChevronDown className={"h-3.5 w-3.5 transition-transform " + (open ? "rotate-180" : "")} />
      </button>

      {open && (
        <div className="absolute right-0 z-30 mt-1 w-64 overflow-hidden rounded-md border border-neutral-200 bg-white shadow-lg">
          <button
            onClick={handleExport}
            className="flex w-full items-start gap-2 px-3 py-2.5 text-left text-sm hover:bg-neutral-100"
          >
            <Download className="mt-0.5 h-4 w-4 shrink-0 text-neutral-500" />
            <div>
              <div className="font-medium text-neutral-900">Download backup</div>
              <div className="text-xs text-neutral-500">
                Save all {events.length} event{events.length === 1 ? "" : "s"} to a .json file
              </div>
            </div>
          </button>
          <button
            onClick={handleRestoreClick}
            className="flex w-full items-start gap-2 border-t border-neutral-100 px-3 py-2.5 text-left text-sm hover:bg-neutral-100"
          >
            <Upload className="mt-0.5 h-4 w-4 shrink-0 text-neutral-500" />
            <div>
              <div className="font-medium text-neutral-900">Restore from file</div>
              <div className="text-xs text-neutral-500">
                Pick a previously-downloaded backup file
              </div>
            </div>
          </button>
        </div>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        onChange={handleFileChange}
        className="hidden"
      />

      {parsed && (
        <RestoreConfirmDialog
          imported={parsed.events}
          exportedAt={parsed.exportedAt}
          currentCount={events.length}
          onCancel={() => setParsed(null)}
          onReplace={() => {
            onReplace(parsed.events);
            setParsed(null);
          }}
          onMerge={() => {
            onMerge(parsed.events);
            setParsed(null);
          }}
        />
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Restore Confirm Dialog
// ──────────────────────────────────────────────────────────────────────────

function RestoreConfirmDialog({
  imported,
  exportedAt,
  currentCount,
  onCancel,
  onReplace,
  onMerge,
}: {
  imported: CalendarEvent[];
  exportedAt?: string;
  currentCount: number;
  onCancel: () => void;
  onReplace: () => void;
  onMerge: () => void;
}) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onCancel]);

  const exportedDateStr = exportedAt
    ? new Date(exportedAt).toLocaleString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} aria-hidden="true" />

      <div className="relative w-full max-w-md rounded-lg bg-white shadow-2xl">
        <header className="flex items-center justify-between border-b border-neutral-200 px-4 py-3">
          <div className="flex items-center gap-2">
            <FileJson className="h-5 w-5 text-blue-600" />
            <h2 className="text-base font-semibold">Restore backup</h2>
          </div>
          <button
            onClick={onCancel}
            className="rounded-md p-1 text-neutral-500 hover:bg-neutral-100"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="space-y-3 p-4">
          <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-sm">
            <div className="font-semibold text-blue-900">
              {imported.length} event{imported.length === 1 ? "" : "s"} loaded from file
            </div>
            {exportedDateStr && (
              <div className="text-xs text-blue-700/80 mt-0.5">Exported {exportedDateStr}</div>
            )}
            <div className="text-xs text-blue-700/80 mt-0.5">
              Your calendar currently has {currentCount} event{currentCount === 1 ? "" : "s"}.
            </div>
          </div>

          <div className="space-y-2 text-sm">
            <div className="rounded-md border border-neutral-200 p-3">
              <div className="font-semibold text-neutral-900">Replace</div>
              <div className="text-xs text-neutral-600">
                Discard your current {currentCount} event{currentCount === 1 ? "" : "s"} and use only
                the events from the file. <strong>Cannot be undone.</strong>
              </div>
            </div>
            <div className="rounded-md border border-neutral-200 p-3">
              <div className="font-semibold text-neutral-900">Merge</div>
              <div className="text-xs text-neutral-600">
                Add events from the file to your calendar. Events with the same ID will be
                overwritten by the file's version; everything else is kept.
              </div>
            </div>
          </div>

          <div className="flex gap-2 rounded-md border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-900">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>Tip: download a fresh backup before restoring, just in case.</div>
          </div>
        </div>

        <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-neutral-200 px-4 py-3">
          <button
            onClick={onCancel}
            className="rounded-md px-3 py-1.5 text-sm text-neutral-600 hover:bg-neutral-100"
          >
            Cancel
          </button>
          <button
            onClick={onMerge}
            className="inline-flex items-center gap-1.5 rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
          >
            Merge
          </button>
          <button
            onClick={onReplace}
            className="inline-flex items-center gap-1.5 rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700"
          >
            Replace
          </button>
        </footer>
      </div>
    </div>
  );
}
