"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "teamvoc-new-badge-days";
const DEFAULT_DAYS = 3;
const MAX_DAYS = 365;

export function useNewBadgeDays() {
  const [days, setDays] = useState<number>(DEFAULT_DAYS);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = parseInt(raw, 10);
      if (!Number.isNaN(parsed) && parsed >= 0 && parsed <= MAX_DAYS) {
        setDays(parsed);
      }
    } catch {
      // ignore localStorage errors
    }
  }, []);

  function updateDays(next: number) {
    const normalized = Number.isFinite(next) ? Math.round(next) : DEFAULT_DAYS;
    const clamped = Math.min(Math.max(normalized, 0), MAX_DAYS);
    setDays(clamped);
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(STORAGE_KEY, String(clamped));
      } catch {
        // ignore localStorage errors
      }
    }
  }

  return [days, updateDays] as const;
}

