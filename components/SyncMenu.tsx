"use client";

import { useEffect, useState } from "react";
import { Cloud, CloudOff, ChevronDown, RefreshCw, Check, AlertCircle, ExternalLink, Trash2 } from "lucide-react";
import type { useGistSync } from "@/lib/useGistSync";

type Sync = ReturnType<typeof useGistSync>;

interface Props {
  sync: Sync;
}

/**
 * Header dropdown to connect the calendar to a private GitHub gist for
 * cross-device sync. When disconnected it walks the user through pasting a
 * `gists`-scope token and creating (or attaching to) a gist; when connected it
 * offers "Sync now", an auto-sync toggle, last-synced time, and disconnect.
 */
export function SyncMenu({ sync }: Props) {
  const [open, setOpen] = useState(false);
  const [tokenInput, setTokenInput] = useState("");
  const [gistIdInput, setGistIdInput] = useState("");
  const [mode, setMode] = useState<"create" | "existing">("create");

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (!t.closest("[data-sync-menu]")) setOpen(false);
    };
    window.addEventListener("mousedown", handler);
    return () => window.removeEventListener("mousedown", handler);
  }, [open]);

  const { connected, status, error, settings } = sync;

  const lastSynced = settings.lastSyncedAt
    ? new Date(settings.lastSyncedAt).toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "never";

  const connect = async () => {
    // Pass the token explicitly to sidestep the async-setState race — the hook
    // persists it into settings on success.
    if (mode === "create") {
      const ok = await sync.createGist(tokenInput);
      if (ok) setTokenInput("");
    } else {
      const ok = await sync.useExistingGist(gistIdInput, tokenInput);
      if (ok) {
        setTokenInput("");
        setGistIdInput("");
      }
    }
  };

  return (
    <div className="relative" data-sync-menu>
      <button
        onClick={() => setOpen((o) => !o)}
        className={
          "inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm " +
          (connected
            ? "border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100"
            : "border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-100")
        }
        title={connected ? "Cloud sync connected" : "Set up cross-device sync"}
      >
        {connected ? <Cloud className="h-3.5 w-3.5" /> : <CloudOff className="h-3.5 w-3.5" />}
        {status === "syncing" ? "Syncing…" : connected ? "Synced" : "Sync"}
        <ChevronDown className={"h-3.5 w-3.5 transition-transform " + (open ? "rotate-180" : "")} />
      </button>

      {open && (
        <div className="absolute right-0 z-30 mt-1 w-80 overflow-hidden rounded-md border border-neutral-200 bg-white p-3 shadow-lg">
          {error && (
            <div className="mb-2 flex items-start gap-1.5 rounded-md border border-red-200 bg-red-50 p-2 text-xs text-red-700">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span className="flex-1">{error}</span>
              <button onClick={sync.clearError} className="text-red-400 hover:text-red-700" aria-label="Dismiss">
                ×
              </button>
            </div>
          )}

          {!connected ? (
            <div className="space-y-2.5">
              <div className="text-sm font-semibold text-neutral-900">Cross-device sync</div>
              <p className="text-xs leading-relaxed text-neutral-600">
                Mirror your events to a <strong>private GitHub gist</strong> so they follow you across
                devices. Your token is stored only in this browser and only ever sent to GitHub.
              </p>
              <a
                href="https://github.com/settings/tokens/new?scopes=gist&description=Yearly%20Calendar%20sync"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:underline"
              >
                Create a token with only the “gist” scope <ExternalLink className="h-3 w-3" />
              </a>

              <label className="block">
                <span className="block text-[11px] font-medium uppercase tracking-wider text-neutral-500">
                  Personal access token
                </span>
                <input
                  type="password"
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                  placeholder="ghp_… or github_pat_…"
                  autoComplete="off"
                  className="mt-0.5 w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm focus:border-neutral-500 focus:outline-none"
                />
              </label>

              <div className="flex gap-1.5 text-xs">
                <button
                  onClick={() => setMode("create")}
                  className={
                    "flex-1 rounded-md border px-2 py-1 " +
                    (mode === "create"
                      ? "border-blue-400 bg-blue-50 text-blue-800"
                      : "border-neutral-200 text-neutral-600 hover:bg-neutral-50")
                  }
                >
                  Create new gist
                </button>
                <button
                  onClick={() => setMode("existing")}
                  className={
                    "flex-1 rounded-md border px-2 py-1 " +
                    (mode === "existing"
                      ? "border-blue-400 bg-blue-50 text-blue-800"
                      : "border-neutral-200 text-neutral-600 hover:bg-neutral-50")
                  }
                >
                  Use existing gist
                </button>
              </div>

              {mode === "existing" && (
                <label className="block">
                  <span className="block text-[11px] font-medium uppercase tracking-wider text-neutral-500">
                    Gist ID
                  </span>
                  <input
                    value={gistIdInput}
                    onChange={(e) => setGistIdInput(e.target.value)}
                    placeholder="e.g. 1a2b3c4d5e6f…"
                    className="mt-0.5 w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm focus:border-neutral-500 focus:outline-none"
                  />
                  <span className="mt-0.5 block text-[10px] text-neutral-500">
                    The long id from the gist URL. Must contain this app’s data file.
                  </span>
                </label>
              )}

              <button
                onClick={connect}
                disabled={!tokenInput || status === "syncing" || (mode === "existing" && !gistIdInput)}
                className="w-full rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {status === "syncing" ? "Connecting…" : mode === "create" ? "Create & connect" : "Connect"}
              </button>
            </div>
          ) : (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold text-neutral-900">Sync</div>
                {status === "ok" && (
                  <span className="inline-flex items-center gap-1 text-xs text-green-600">
                    <Check className="h-3.5 w-3.5" /> up to date
                  </span>
                )}
              </div>
              <div className="text-xs text-neutral-500">
                Last synced: <span className="font-medium text-neutral-700">{lastSynced}</span>
              </div>

              <button
                onClick={() => void sync.sync()}
                disabled={status === "syncing"}
                className="flex w-full items-center justify-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                <RefreshCw className={"h-3.5 w-3.5 " + (status === "syncing" ? "animate-spin" : "")} />
                {status === "syncing" ? "Syncing…" : "Sync now"}
              </button>

              <label className="flex cursor-pointer items-center gap-2 rounded-md border border-neutral-200 p-2 text-sm">
                <input
                  type="checkbox"
                  checked={settings.autoSync}
                  onChange={(e) => sync.setAutoSync(e.target.checked)}
                  className="h-4 w-4 rounded border-neutral-300"
                />
                <span>
                  <span className="font-medium text-neutral-800">Auto-sync</span>
                  <span className="block text-[11px] text-neutral-500">
                    Pull on load and push a few seconds after each change.
                  </span>
                </span>
              </label>

              <div className="rounded-md bg-neutral-50 p-2 text-[10px] text-neutral-500">
                Gist: <span className="font-mono">{settings.gistId.slice(0, 12)}…</span> (private)
              </div>

              <button
                onClick={sync.disconnect}
                className="flex w-full items-center justify-center gap-1.5 rounded-md border border-neutral-300 px-3 py-1.5 text-sm text-neutral-600 hover:bg-red-50 hover:text-red-700 hover:border-red-300"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Disconnect (clears token from this browser)
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
