"use client";

import { useEffect } from "react";

const STORAGE_KEY = "teamvoc-home-last-reload";
const DAY_MS = 24 * 60 * 60 * 1000;

export function HomeAutoReload() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const now = Date.now();
    let lastReload = 0;

    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = parseInt(raw, 10);
        if (!Number.isNaN(parsed)) lastReload = parsed;
      }
    } catch {
      // ignore localStorage errors
    }

    // First load: record timestamp, no immediate reload.
    if (!lastReload) {
      try {
        window.localStorage.setItem(STORAGE_KEY, String(now));
      } catch {
        // ignore
      }
      const timeout = window.setTimeout(() => {
        try {
          window.localStorage.setItem(STORAGE_KEY, String(Date.now()));
        } catch {
          // ignore
        }
        window.location.reload();
      }, DAY_MS);
      return () => window.clearTimeout(timeout);
    }

    const elapsed = now - lastReload;

    // If it's already been at least a day since the last reload, reload now once,
    // then the subsequent mount will schedule the next daily reload.
    if (elapsed >= DAY_MS) {
      try {
        window.localStorage.setItem(STORAGE_KEY, String(now));
      } catch {
        // ignore
      }
      window.location.reload();
      return;
    }

    const remaining = DAY_MS - elapsed;
    const timeout = window.setTimeout(() => {
      try {
        window.localStorage.setItem(STORAGE_KEY, String(Date.now()));
      } catch {
        // ignore
      }
      window.location.reload();
    }, remaining);

    return () => window.clearTimeout(timeout);
  }, []);

  return null;
}

