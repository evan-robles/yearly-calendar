"use client";

import { useEffect, useRef, useState } from "react";
import { X, ExternalLink, FileText, AlertCircle, Pencil } from "lucide-react";
import { MIN_WIDTH, MAX_WIDTH, type NormalizedDoc } from "@/lib/useDocPanel";

interface Props {
  open: boolean;
  url: string;
  doc: NormalizedDoc | null;
  width: number;
  onSetUrl: (url: string) => void;
  onSetWidth: (w: number) => void;
  onClose: () => void;
}

/**
 * A right-docked, resizable side panel that embeds a Google Doc as a read-only
 * /preview iframe next to the calendar. Google blocks in-frame editing, so the
 * panel shows a live preview plus an "Open in Google Docs" link to edit.
 *
 * Fixed-position overlay (off-canvas when closed via translate-x). The page
 * shifts its right margin to match `width` so the calendar isn't covered.
 */
export function DocPanel({ open, url, doc, width, onSetUrl, onSetWidth, onClose }: Props) {
  const [draft, setDraft] = useState(url);
  const draggingRef = useRef(false);

  // Keep the input in sync if the stored URL changes elsewhere.
  useEffect(() => setDraft(url), [url]);

  // Drag-to-resize from the left edge. Width grows as the pointer moves left.
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (!draggingRef.current) return;
      onSetWidth(window.innerWidth - e.clientX);
    };
    const onUp = () => {
      draggingRef.current = false;
      document.body.style.userSelect = "";
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [onSetWidth]);

  return (
    <aside
      aria-hidden={!open}
      className={
        "fixed right-0 top-0 z-30 flex h-screen flex-col border-l border-line bg-surface shadow-pop transition-transform duration-200 " +
        (open ? "translate-x-0" : "translate-x-full")
      }
      style={{ width: `min(${width}px, 92vw)` }}
    >
      {/* Resize handle (desktop) */}
      <div
        onPointerDown={(e) => {
          draggingRef.current = true;
          document.body.style.userSelect = "none";
          (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
        }}
        className="absolute left-0 top-0 hidden h-full w-1.5 -translate-x-1/2 cursor-col-resize hover:bg-brand/30 sm:block"
        title="Drag to resize"
        role="separator"
        aria-orientation="vertical"
      />

      {/* Header */}
      <div className="flex items-center gap-2 border-b border-line px-3.5 py-2.5">
        <FileText className="h-4 w-4 text-brand" />
        <span className="text-sm font-semibold text-ink">Doc</span>
        {doc && (
          <a
            href={doc.editUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto inline-flex items-center gap-1 rounded-lg border border-line px-2 py-1 text-xs font-medium text-brand transition-colors hover:bg-brand-soft/40"
            title="Open in Google Docs to edit"
          >
            <Pencil className="h-3 w-3" />
            Edit
            <ExternalLink className="h-3 w-3" />
          </a>
        )}
        <button
          onClick={onClose}
          className={"rounded-lg p-1.5 text-muted transition-colors hover:bg-canvas hover:text-ink " + (doc ? "" : "ml-auto")}
          title="Close panel"
          aria-label="Close doc panel"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* URL input */}
      <div className="border-b border-line px-3.5 py-2.5">
        <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-muted">
          Google Doc link
        </label>
        <div className="flex gap-1.5">
          <input
            type="url"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={() => onSetUrl(draft)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                onSetUrl(draft);
                (e.target as HTMLInputElement).blur();
              }
            }}
            placeholder="Paste a shared Google Doc URL…"
            className="min-w-0 flex-1 rounded-lg border border-line bg-canvas px-2.5 py-1.5 text-sm text-ink outline-none focus:border-brand"
          />
          {draft && (
            <button
              onClick={() => {
                setDraft("");
                onSetUrl("");
              }}
              className="rounded-lg border border-line px-2 text-xs text-muted transition-colors hover:bg-canvas hover:text-ink"
              title="Clear"
            >
              Clear
            </button>
          )}
        </div>
        {url && !doc && (
          <p className="mt-1.5 flex items-start gap-1.5 text-xs text-red-600">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            That doesn&rsquo;t look like a Google Docs link (expected docs.google.com/…).
          </p>
        )}
      </div>

      {/* Body: iframe preview, or an empty / help state */}
      <div className="relative min-h-0 flex-1 bg-canvas/40">
        {doc ? (
          <iframe
            key={doc.embedUrl}
            src={doc.embedUrl}
            title="Google Doc preview"
            className="h-full w-full border-0"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center">
            <FileText className="h-8 w-8 text-line" />
            <p className="text-sm font-medium text-ink">No doc yet</p>
            <p className="max-w-[15rem] text-xs leading-relaxed text-muted">
              In Google Docs, choose <strong>Share → Anyone with the link</strong>, copy the URL, and paste it above.
              The preview is read-only; use <strong>Edit</strong> to make changes.
            </p>
          </div>
        )}
      </div>
    </aside>
  );
}
