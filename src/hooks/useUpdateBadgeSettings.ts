"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { UPDATE_BADGE_DAYS_DEFAULT, clampUpdateBadgeDays } from "@/lib/updateBadgeSettings";

const PERSIST_DEBOUNCE_MS = 450;
const FOCUS_REFETCH_DEBOUNCE_MS = 400;

function badgeSettingsUrl() {
  return `/api/updates/badge-settings?ts=${Date.now()}`;
}

export function useUpdateBadgeSettings(options?: { persistChanges?: boolean }) {
  const persistChanges = options?.persistChanges ?? false;
  const [updatedBadgeDays, setUpdatedBadgeDaysState] = useState<number>(UPDATE_BADGE_DAYS_DEFAULT);
  const [loaded, setLoaded] = useState(false);
  const persistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const focusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const daysRef = useRef(updatedBadgeDays);
  daysRef.current = updatedBadgeDays;

  const applyFromResponse = useCallback((r: Response, data: unknown) => {
    if (!r.ok || !data || typeof data !== "object") return false;
    const row = data as { updatedBadgeDays?: unknown };
    if (typeof row.updatedBadgeDays !== "number") return false;
    setUpdatedBadgeDaysState(
      clampUpdateBadgeDays(row.updatedBadgeDays, UPDATE_BADGE_DAYS_DEFAULT)
    );
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
        body: JSON.stringify({ updatedBadgeDays: daysRef.current }),
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
        body: JSON.stringify({ updatedBadgeDays: daysRef.current }),
        cache: "no-store",
        credentials: "same-origin",
      });
    };
  }, [persistChanges]);

  const setUpdatedBadgeDays = useCallback(
    (next: number) => {
      const v = clampUpdateBadgeDays(next, UPDATE_BADGE_DAYS_DEFAULT);
      setUpdatedBadgeDaysState(v);
      schedulePersist();
    },
    [schedulePersist]
  );

  return { updatedBadgeDays, setUpdatedBadgeDays, loaded } as const;
}
