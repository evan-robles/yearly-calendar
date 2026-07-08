"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { CalendarEvent } from "./types";
import { validateEvents } from "./validation";
import { wrapPayload, STORAGE_VERSION } from "./migrate";

// ─────────────────────────────────────────────────────────────────────────────
// GitHub Gist sync
//
// Cross-device persistence without a backend: the event list is mirrored to a
// PRIVATE GitHub gist. The user supplies a Personal Access Token with only the
// `gists` scope. That token is stored ONLY in this browser's localStorage and is
// sent ONLY to api.github.com over HTTPS — it is never committed, logged, or
// transmitted anywhere else. See README for the security model and how to revoke.
//
// Reconcile strategy: newest-wins by `updatedAt` per event id (see
// useEvents.mergeNewestWins). `sync()` pulls the remote list, merges it with the
// local list keeping the most-recently-edited version of each event, pushes the
// merged result back, and returns it so local state converges too.
// ─────────────────────────────────────────────────────────────────────────────

const SETTINGS_KEY = "yearly-calendar:sync:v1";
const GIST_FILENAME = "yearly-calendar.json";
const GIST_DESCRIPTION = "Yearly Calendar — synced events (managed by the app)";
const API = "https://api.github.com";

export interface SyncSettings {
  token: string;
  gistId: string;
  autoSync: boolean;
  lastSyncedAt: string | null;
}

const EMPTY_SETTINGS: SyncSettings = { token: "", gistId: "", autoSync: false, lastSyncedAt: null };

export type SyncStatus = "idle" | "syncing" | "ok" | "error";

function loadSettings(): SyncSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return EMPTY_SETTINGS;
    const parsed = JSON.parse(raw);
    return {
      token: typeof parsed.token === "string" ? parsed.token : "",
      gistId: typeof parsed.gistId === "string" ? parsed.gistId : "",
      autoSync: Boolean(parsed.autoSync),
      lastSyncedAt: typeof parsed.lastSyncedAt === "string" ? parsed.lastSyncedAt : null,
    };
  } catch {
    return EMPTY_SETTINGS;
  }
}

function ghHeaders(token: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

/** Turn a fetch Response failure into a helpful message. */
async function describeError(res: Response): Promise<string> {
  if (res.status === 401) return "Invalid or expired token (401). Check the token and its 'gists' scope.";
  if (res.status === 403) return "Forbidden or rate-limited (403). Wait a moment or verify token scope.";
  if (res.status === 404) return "Gist not found (404). It may have been deleted; create a new one.";
  let detail = "";
  try {
    const body = await res.json();
    detail = body?.message ? ` — ${body.message}` : "";
  } catch {
    /* ignore */
  }
  return `GitHub API error ${res.status}${detail}.`;
}

export function useGistSync(
  localEvents: CalendarEvent[],
  hydrated: boolean,
  applyMerged: (incoming: CalendarEvent[]) => CalendarEvent[]
) {
  const [settings, setSettings] = useState<SyncSettings>(EMPTY_SETTINGS);
  const [loaded, setLoaded] = useState(false);
  const [status, setStatus] = useState<SyncStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  // Hydrate settings on mount.
  useEffect(() => {
    setSettings(loadSettings());
    setLoaded(true);
  }, []);

  // Persist settings whenever they change (after load).
  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch {
      /* ignore quota */
    }
  }, [settings, loaded]);

  const connected = Boolean(settings.token && settings.gistId);

  const setToken = useCallback((token: string) => {
    setSettings((s) => ({ ...s, token: token.trim() }));
    setError(null);
  }, []);

  const disconnect = useCallback(() => {
    setSettings(EMPTY_SETTINGS);
    setStatus("idle");
    setError(null);
  }, []);

  const setAutoSync = useCallback((autoSync: boolean) => {
    setSettings((s) => ({ ...s, autoSync }));
  }, []);

  /** Serialize the current events into the gist file body. */
  const fileContent = useCallback((events: CalendarEvent[]) => {
    return JSON.stringify({ ...wrapPayload(events), version: STORAGE_VERSION }, null, 2);
  }, []);

  /** Create a new PRIVATE gist seeded with the current local events. An explicit
   *  `tokenOverride` avoids a state race when connecting right after the token
   *  is typed (React state updates are async). */
  const createGist = useCallback(async (tokenOverride?: string): Promise<boolean> => {
    const token = (tokenOverride ?? settings.token).trim();
    if (!token) {
      setError("Enter a token first.");
      return false;
    }
    setStatus("syncing");
    setError(null);
    try {
      const res = await fetch(`${API}/gists`, {
        method: "POST",
        headers: ghHeaders(token),
        body: JSON.stringify({
          description: GIST_DESCRIPTION,
          public: false,
          files: { [GIST_FILENAME]: { content: fileContent(localEvents) } },
        }),
      });
      if (!res.ok) {
        setError(await describeError(res));
        setStatus("error");
        return false;
      }
      const body = await res.json();
      setSettings((s) => ({ ...s, token, gistId: body.id, lastSyncedAt: new Date().toISOString() }));
      setStatus("ok");
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error creating gist.");
      setStatus("error");
      return false;
    }
  }, [settings.token, localEvents, fileContent]);

  /** Attach to an existing gist id (validates it holds our file). */
  const useExistingGist = useCallback(
    async (gistId: string, tokenOverride?: string): Promise<boolean> => {
      const id = gistId.trim();
      const token = (tokenOverride ?? settings.token).trim();
      if (!token || !id) {
        setError("Enter both a token and a gist id.");
        return false;
      }
      setStatus("syncing");
      setError(null);
      try {
        const res = await fetch(`${API}/gists/${id}`, { headers: ghHeaders(token) });
        if (!res.ok) {
          setError(await describeError(res));
          setStatus("error");
          return false;
        }
        const body = await res.json();
        if (!body.files?.[GIST_FILENAME]) {
          setError(`That gist has no '${GIST_FILENAME}' file. Pick a gist created by this app, or create a new one.`);
          setStatus("error");
          return false;
        }
        setSettings((s) => ({ ...s, token, gistId: id }));
        setStatus("ok");
        return true;
      } catch (e) {
        setError(e instanceof Error ? e.message : "Network error reading gist.");
        setStatus("error");
        return false;
      }
    },
    [settings.token]
  );

  /** Fetch + validate the remote events. Returns null on error (error state set). */
  const pull = useCallback(async (): Promise<CalendarEvent[] | null> => {
    if (!connected) return null;
    const res = await fetch(`${API}/gists/${settings.gistId}`, { headers: ghHeaders(settings.token) });
    if (!res.ok) {
      setError(await describeError(res));
      setStatus("error");
      return null;
    }
    const body = await res.json();
    const raw = body.files?.[GIST_FILENAME]?.content;
    if (typeof raw !== "string") {
      setError(`Remote gist is missing '${GIST_FILENAME}'.`);
      setStatus("error");
      return null;
    }
    try {
      return validateEvents(JSON.parse(raw), new Date().toISOString());
    } catch (e) {
      setError(`Remote data is invalid: ${e instanceof Error ? e.message : "parse error"}.`);
      setStatus("error");
      return null;
    }
  }, [connected, settings.gistId, settings.token]);

  /** Overwrite the remote file with the given events. */
  const push = useCallback(
    async (events: CalendarEvent[]): Promise<boolean> => {
      if (!connected) return false;
      const res = await fetch(`${API}/gists/${settings.gistId}`, {
        method: "PATCH",
        headers: ghHeaders(settings.token),
        body: JSON.stringify({ files: { [GIST_FILENAME]: { content: fileContent(events) } } }),
      });
      if (!res.ok) {
        setError(await describeError(res));
        setStatus("error");
        return false;
      }
      return true;
    },
    [connected, settings.gistId, settings.token, fileContent]
  );

  /**
   * Full reconcile: pull remote → merge newest-wins with local → push merged →
   * converge local state. Returns true on success.
   */
  const sync = useCallback(async (): Promise<boolean> => {
    if (!connected) {
      setError("Not connected. Enter a token and create/select a gist first.");
      return false;
    }
    setStatus("syncing");
    setError(null);
    const remote = await pull();
    if (remote === null) return false; // error already set
    const merged = applyMerged(remote); // updates local state, returns merged list
    const ok = await push(merged);
    if (!ok) return false;
    setSettings((s) => ({ ...s, lastSyncedAt: new Date().toISOString() }));
    setStatus("ok");
    return true;
  }, [connected, pull, push, applyMerged]);

  // Auto-sync: debounced push-through-sync after local edits, plus a pull on
  // first load. Kept conservative (3s debounce) to avoid hammering the API.
  const debounceRef = useRef<number | null>(null);
  const didInitialPull = useRef(false);

  useEffect(() => {
    if (!loaded || !hydrated || !connected || !settings.autoSync) return;
    if (!didInitialPull.current) {
      didInitialPull.current = true;
      void sync();
      return;
    }
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => void sync(), 3000);
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
    // Re-run when the local events change so edits propagate.
  }, [localEvents, loaded, hydrated, connected, settings.autoSync, sync]);

  return {
    settings,
    connected,
    status,
    error,
    setToken,
    disconnect,
    setAutoSync,
    createGist,
    useExistingGist,
    sync,
    clearError: () => setError(null),
  };
}
