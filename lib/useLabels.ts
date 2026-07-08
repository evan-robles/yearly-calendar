"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { DEFAULT_LABELS, UNKNOWN_LABEL, type Label } from "./types";
import { validateLabels } from "./validation";

const STORAGE_KEY = "yearly-calendar:labels:v1";

function nowISO(): string {
  return new Date().toISOString();
}

function genId(): string {
  return `lbl-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Owns the user-managed label list. Labels are created/edited/deleted at runtime,
 * persisted to localStorage, and synced (as part of the gist payload). A fresh
 * install starts EMPTY (DEFAULT_LABELS is []) — the user makes their own.
 *
 * `getLabel(id)` always returns a Label: the matching one, or a neutral
 * UNKNOWN_LABEL fallback so an event referencing a deleted/unknown label never
 * crashes a render.
 */
export function useLabels() {
  const [labels, setLabels] = useState<Label[]>([]);
  const [labelsUpdatedAt, setLabelsUpdatedAt] = useState<string>("1970-01-01T00:00:00.000Z");
  const [hydrated, setHydrated] = useState(false);

  // Hydrate once.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { labels?: unknown; updatedAt?: unknown };
        setLabels(validateLabels(parsed?.labels));
        if (typeof parsed?.updatedAt === "string") setLabelsUpdatedAt(parsed.updatedAt);
      } else {
        setLabels([...DEFAULT_LABELS]);
      }
    } catch {
      setLabels([...DEFAULT_LABELS]);
    }
    setHydrated(true);
  }, []);

  // Persist on change.
  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ labels, updatedAt: labelsUpdatedAt }));
    } catch {
      /* ignore quota */
    }
  }, [labels, labelsUpdatedAt, hydrated]);

  /** Mutate the list and stamp the set-level updatedAt (drives sync merge). */
  const commit = useCallback((next: Label[]) => {
    setLabels(next);
    setLabelsUpdatedAt(nowISO());
  }, []);

  const addLabel = useCallback(
    (draft: Omit<Label, "id" | "priority">) => {
      setLabels((prev) => {
        const priority = prev.length ? Math.max(...prev.map((l) => l.priority)) + 1 : 1;
        const next = [...prev, { ...draft, id: genId(), priority }];
        return next;
      });
      setLabelsUpdatedAt(nowISO());
    },
    []
  );

  const updateLabel = useCallback((id: string, patch: Partial<Omit<Label, "id">>) => {
    setLabels((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));
    setLabelsUpdatedAt(nowISO());
  }, []);

  const deleteLabel = useCallback((id: string) => {
    setLabels((prev) => prev.filter((l) => l.id !== id));
    setLabelsUpdatedAt(nowISO());
  }, []);

  /** Move a label up/down in priority order by swapping with its neighbor. */
  const moveLabel = useCallback((id: string, dir: -1 | 1) => {
    setLabels((prev) => {
      const sorted = [...prev].sort((a, b) => a.priority - b.priority);
      const i = sorted.findIndex((l) => l.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= sorted.length) return prev;
      [sorted[i], sorted[j]] = [sorted[j], sorted[i]];
      // Reassign contiguous priorities to reflect new order.
      return sorted.map((l, idx) => ({ ...l, priority: idx + 1 }));
    });
    setLabelsUpdatedAt(nowISO());
  }, []);

  const resetLabels = useCallback(() => {
    commit([...DEFAULT_LABELS]);
  }, [commit]);

  /** Replace the entire set (used by sync when the remote set wins). */
  const replaceLabels = useCallback((next: Label[], stamp?: string) => {
    setLabels(next);
    if (stamp) setLabelsUpdatedAt(stamp);
  }, []);

  const labelsById = useMemo(() => new Map(labels.map((l) => [l.id, l])), [labels]);

  /** Safe lookup: never returns undefined. */
  const getLabel = useCallback(
    (id: string): Label => labelsById.get(id) ?? { ...UNKNOWN_LABEL, id },
    [labelsById]
  );

  const sortedLabels = useMemo(
    () => [...labels].sort((a, b) => a.priority - b.priority),
    [labels]
  );

  return {
    labels: sortedLabels,
    labelsById,
    labelsUpdatedAt,
    hydrated,
    getLabel,
    addLabel,
    updateLabel,
    deleteLabel,
    moveLabel,
    resetLabels,
    replaceLabels,
  };
}
