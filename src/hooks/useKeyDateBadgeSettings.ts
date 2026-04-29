"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  KEY_DATE_BADGE_NEW_DEFAULT,
  KEY_DATE_BADGE_SOON_DEFAULT,
  clampKeyDateBadgeDays,
} from "@/lib/keyDateBadgeSettings";

const PERSIST_DEBOUNCE_MS = 450;

export function useKeyDateBadgeSettings(options?: { persistChanges?: boolean }) {
  const persistChanges = options?.persistChanges ?? false;
  const [newBadgeDays, setNewBadgeDaysState] = useState<number>(KEY_DATE_BADGE_NEW_DEFAULT);
  const [soonBadgeDays, setSoonBadgeDaysState] = useState<number>(KEY_DATE_BADGE_SOON_DEFAULT);
  const [loaded, setLoaded] = useState(false);
  const persistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const newRef = useRef(newBadgeDays);
  const soonRef = useRef(soonBadgeDays);
  newRef.current = newBadgeDays;
  soonRef.current = soonBadgeDays;

  useEffect(() => {
    let cancelled = false;
    fetch("/api/key-dates/badge-settings", { cache: "no-store" })
      .then(async (r) => {
        const data = (await r.json().catch(() => null)) as {
          newBadgeDays?: unknown;
          soonBadgeDays?: unknown;
        } | null;
        if (cancelled || !data) return;
        setNewBadgeDaysState(clampKeyDateBadgeDays(data.newBadgeDays, KEY_DATE_BADGE_NEW_DEFAULT));
        setSoonBadgeDaysState(clampKeyDateBadgeDays(data.soonBadgeDays, KEY_DATE_BADGE_SOON_DEFAULT));
      })
      .catch(() => {
        /* keep defaults */
      })
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const schedulePersist = useCallback(() => {
    if (!persistChanges) return;
    if (persistTimerRef.current) clearTimeout(persistTimerRef.current);
    persistTimerRef.current = setTimeout(() => {
      persistTimerRef.current = null;
      fetch("/api/key-dates/badge-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          newBadgeDays: newRef.current,
          soonBadgeDays: soonRef.current,
        }),
        cache: "no-store",
      })
        .then(async (r) => {
          if (!r.ok) return;
          const data = (await r.json().catch(() => null)) as {
            newBadgeDays?: unknown;
            soonBadgeDays?: unknown;
          } | null;
          if (!data) return;
          setNewBadgeDaysState(clampKeyDateBadgeDays(data.newBadgeDays, KEY_DATE_BADGE_NEW_DEFAULT));
          setSoonBadgeDaysState(clampKeyDateBadgeDays(data.soonBadgeDays, KEY_DATE_BADGE_SOON_DEFAULT));
        })
        .catch(() => {
          /* ignore */
        });
    }, PERSIST_DEBOUNCE_MS);
  }, [persistChanges]);

  useEffect(() => {
    return () => {
      if (!persistTimerRef.current) return;
      clearTimeout(persistTimerRef.current);
      persistTimerRef.current = null;
      if (!persistChanges) return;
      void fetch("/api/key-dates/badge-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          newBadgeDays: newRef.current,
          soonBadgeDays: soonRef.current,
        }),
        cache: "no-store",
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
