"use client";

import { useCallback, useEffect, useState } from "react";

const URL_KEY = "yearly-calendar:docpanel:url:v1";
const OPEN_KEY = "yearly-calendar:docpanel:open:v1";
const WIDTH_KEY = "yearly-calendar:docpanel:width:v1";

const DEFAULT_WIDTH = 420;
export const MIN_WIDTH = 300;
export const MAX_WIDTH = 760;

export interface NormalizedDoc {
  /** Embeddable read-only URL for the iframe (…/preview). */
  embedUrl: string;
  /** Editable URL to open in a new tab (…/edit). */
  editUrl: string;
}

/**
 * Normalize any Google Docs share URL into an embeddable /preview form and an
 * editable /edit form.
 *
 * Google blocks in-frame editing (X-Frame-Options), so an iframe can only show
 * the read-only /preview. We derive both from the document id.
 *
 * Accepts the common shapes:
 *   https://docs.google.com/document/d/<ID>/edit?usp=sharing
 *   https://docs.google.com/document/d/<ID>/view
 *   https://docs.google.com/document/d/<ID>
 *   …and the same for Sheets/Slides/Forms (any docs.google.com /d/<ID>/… path).
 *
 * Returns null when the string isn't a recognizable Google Docs URL.
 */
export function normalizeGoogleDocUrl(raw: string): NormalizedDoc | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  let u: URL;
  try {
    u = new URL(trimmed);
  } catch {
    return null;
  }
  if (u.hostname !== "docs.google.com") return null;

  // Path looks like /document/d/<ID>/edit  (or /spreadsheets/d/…, /presentation/d/…)
  const parts = u.pathname.split("/").filter(Boolean); // ["document","d","<ID>","edit"]
  const dIdx = parts.indexOf("d");
  if (dIdx === -1 || !parts[dIdx + 1]) return null;

  const kind = parts[0]; // "document" | "spreadsheets" | "presentation" | ...
  const id = parts[dIdx + 1];
  const base = `https://docs.google.com/${kind}/d/${id}`;

  // Spreadsheets/Slides also support /preview; /edit is the universal editor path.
  return { embedUrl: `${base}/preview`, editUrl: `${base}/edit` };
}

/**
 * Owns the side-panel state: which Google Doc, whether it's open, and its width.
 * All persisted to localStorage; SSR-safe (reads happen after mount).
 */
export function useDocPanel() {
  const [url, setUrlState] = useState("");
  const [open, setOpen] = useState(false);
  const [width, setWidthState] = useState(DEFAULT_WIDTH);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      setUrlState(localStorage.getItem(URL_KEY) ?? "");
      setOpen(localStorage.getItem(OPEN_KEY) === "1");
      const w = Number(localStorage.getItem(WIDTH_KEY));
      if (Number.isFinite(w) && w >= MIN_WIDTH && w <= MAX_WIDTH) setWidthState(w);
    } catch {
      /* localStorage unavailable — fall back to defaults */
    }
    setHydrated(true);
  }, []);

  const setUrl = useCallback((next: string) => {
    setUrlState(next);
    try {
      if (next) localStorage.setItem(URL_KEY, next);
      else localStorage.removeItem(URL_KEY);
    } catch {}
  }, []);

  const toggle = useCallback(() => {
    setOpen((o) => {
      const next = !o;
      try {
        localStorage.setItem(OPEN_KEY, next ? "1" : "0");
      } catch {}
      return next;
    });
  }, []);

  const close = useCallback(() => {
    setOpen(false);
    try {
      localStorage.setItem(OPEN_KEY, "0");
    } catch {}
  }, []);

  const setWidth = useCallback((next: number) => {
    const clamped = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, Math.round(next)));
    setWidthState(clamped);
    try {
      localStorage.setItem(WIDTH_KEY, String(clamped));
    } catch {}
  }, []);

  const doc = normalizeGoogleDocUrl(url);

  return { url, setUrl, doc, open, toggle, close, width, setWidth, hydrated };
}
