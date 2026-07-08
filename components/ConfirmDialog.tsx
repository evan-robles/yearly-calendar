"use client";

import { useEffect } from "react";
import { AlertTriangle, X } from "lucide-react";

interface Props {
  title: string;
  /** Body message. Newlines render as separate lines. */
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** When true, the confirm button is styled as a destructive (red) action. */
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * A styled, accessible replacement for the blocking native `window.confirm`.
 * Escape or backdrop-click cancels; the confirm button autofocuses so Enter
 * confirms. Consistent with the app's other modal dialogs.
 */
export function ConfirmDialog({
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive = false,
  onConfirm,
  onCancel,
}: Props) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onCancel]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} aria-hidden="true" />

      <div className="relative w-full max-w-sm rounded-lg bg-white shadow-2xl">
        <header className="flex items-center justify-between border-b border-neutral-200 px-4 py-3">
          <div className="flex items-center gap-2">
            {destructive && <AlertTriangle className="h-5 w-5 text-red-600" />}
            <h2 className="text-base font-semibold">{title}</h2>
          </div>
          <button onClick={onCancel} className="rounded-md p-1 text-neutral-500 hover:bg-neutral-100" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="px-4 py-4 text-sm text-neutral-700">
          {message.split("\n").map((line, i) => (
            <p key={i} className={i > 0 ? "mt-2" : undefined}>
              {line}
            </p>
          ))}
        </div>

        <footer className="flex items-center justify-end gap-2 border-t border-neutral-200 px-4 py-3">
          <button onClick={onCancel} className="rounded-md px-3 py-1.5 text-sm text-neutral-600 hover:bg-neutral-100">
            {cancelLabel}
          </button>
          <button
            autoFocus
            onClick={onConfirm}
            className={
              "rounded-md px-3 py-1.5 text-sm font-medium text-white " +
              (destructive ? "bg-red-600 hover:bg-red-700" : "bg-neutral-900 hover:bg-neutral-800")
            }
          >
            {confirmLabel}
          </button>
        </footer>
      </div>
    </div>
  );
}
