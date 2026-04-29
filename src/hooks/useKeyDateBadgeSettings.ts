"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  KEY_DATE_BADGE_NEW_DEFAULT,
  KEY_DATE_BADGE_SOON_DEFAULT,
  clampKeyDateBadgeDays,
} from "@/lib/keyDateBadgeSettings";

const PERSIST_DEBOUNCE_MS = 450;
const FOCUS_REFETCH_DEBOUNCE_MS = 400;

function badgeSettingsUrl() {
  return `/api/key-dates/badge-settings?ts=${Date.now()}`;
}

export function useKeyDateBadgeSettings(options?: { persistChanges?: boolean }) {
  const persistChanges = options?.persistChanges ?? false;
  const [newBadgeDays, setNewBadgeDaysState] = useState<number>(KEY_DATE_BADGE_NEW_DEFAULT);
  const [soonBadgeDays, setSoonBadgeDaysState] = useState<number>(KEY_DATE_BADGE_SOON_DEFAULT);
  const [loaded, setLoaded] = useState(false);
  const persistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const focusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const newRef = useRef(newBadgeDays);
  const soonRef = useRef(soonBadgeDays);
  newRef.current = newBadgeDays;
  soonRef.current = soonBadgeDays;

  const applyFromResponse = useCallback((r: Response, data: unknown) => {
    if (!r.ok || !data || typeof data !== "object") return false;
    const row = data as { newBadgeDays?: unknown; soonBadgeDays?: unknown };
    if (typeof row.newBadgeDays !== "number" || typeof row.soonBadgeDays !== "number") {
      return false;
    }
    setNewBadgeDaysState(clampKeyDateBadgeDays(row.newBadgeDays, KEY_DATE_BADGE_NEW_DEFAULT));
    setSoonBadgeDaysState(clampKeyDateBadgeDays(row.soonBadgeDays, KEY_DATE_BADGE_SOON_DEFAULT));
    return true;
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const r = await fetch(badgeSettingsUrl(), {
          cache: "no-store",
          credentials: "same-origin",
        });
        const data = await r.json().catch(() => null);
        if (cancelled) return;
        applyFromResponse(r, data);
      } catch {
        /* network / abort */
      } finally {
        if (!cancelled) setLoaded(true);
      }
    }

    load();

    function scheduleFocusRefetch() {
      if (focusTimerRef.current) clearTimeout(focusTimerRef.current);
      focusTimerRef.current = setTimeout(() => {
        focusTimerRef.current = null;
        if (!cancelled) void load();
      }, FOCUS_REFETCH_DEBOUNCE_MS);
    }

    function onPageShow(e: PageTransitionEvent) {
      if (e.persisted && !cancelled) void load();
    }

    function onFocus() {
      if (!cancelled) scheduleFocusRefetch();
    }

    window.addEventListener("pageshow", onPageShow);
    window.addEventListener("focus", onFocus);

    return () => {
      cancelled = true;
      if (focusTimerRef.current) clearTimeout(focusTimerRef.current);
      window.removeEventListener("pageshow", onPageShow);
      window.removeEventListener("focus", onFocus);
    };
  }, [applyFromResponse]);

  const schedulePersist = useCallback(() => {
    if (!persistChanges) return;
    if (persistTimerRef.current) clearTimeout(persistTimerRef.current);
    persistTimerRef.current = setTimeout(() => {
      persistTimerRef.current = null;
      fetch(badgeSettingsUrl(), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          newBadgeDays: newRef.current,
          soonBadgeDays: soonRef.current,
        }),
        cache: "no-store",
        credentials: "same-origin",
      })
        .then(async (r) => {
          const data = await r.json().catch(() => null);
          if (!r.ok || !data) return;
          applyFromResponse(r, data);
        })
        .catch(() => {
          /* ignore */
        });
    }, PERSIST_DEBOUNCE_MS);
  }, [persistChanges, applyFromResponse]);

  useEffect(() => {
    return () => {
      if (!persistTimerRef.current) return;
      clearTimeout(persistTimerRef.current);
      persistTimerRef.current = null;
      if (!persistChanges) return;
      void fetch(badgeSettingsUrl(), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          newBadgeDays: newRef.current,
          soonBadgeDays: soonRef.current,
        }),
        cache: "no-store",
        credentials: "same-origin",
      });
    };
  }, [persistChanges]);

  const setNewBadgeDays = useCallback(
    (next: number) => {
      const v = clampKeyDateBadgeDays(next, KEY_DATE_BADGE_NEW_DEFAULT);
      setNewBadgeDaysState(v);
      schedulePersist();
    },
    [schedulePersist]
  );

  const setSoonBadgeDays = useCallback(
    (next: number) => {
      const v = clampKeyDateBadgeDays(next, KEY_DATE_BADGE_SOON_DEFAULT);
      setSoonBadgeDaysState(v);
      schedulePersist();
    },
    [schedulePersist]
  );

  return { newBadgeDays, soonBadgeDays, setNewBadgeDays, setSoonBadgeDays, loaded } as const;
}
