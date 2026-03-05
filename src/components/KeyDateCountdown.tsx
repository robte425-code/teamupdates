"use client";

import { useEffect, useState } from "react";

const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const ONE_HOUR_MS = 60 * 60 * 1000;
const ONE_MINUTE_MS = 60 * 1000;

function getDiffMs(eventDate: string): number {
  return new Date(eventDate).getTime() - Date.now();
}

function formatCountdown(diffMs: number): string {
  if (diffMs <= 0) return "Expired";
  const hours = Math.floor(diffMs / ONE_HOUR_MS);
  const minutes = Math.floor((diffMs % ONE_HOUR_MS) / ONE_MINUTE_MS);
  const seconds = Math.floor((diffMs % ONE_MINUTE_MS) / 1000);
  const parts = [];
  if (hours > 0) parts.push(`${hours}h`);
  parts.push(`${String(minutes).padStart(hours > 0 ? 2 : 1, "0")}m`);
  parts.push(`${String(seconds).padStart(2, "0")}s`);
  return parts.join(" ") + " left";
}

/**
 * Live countdown for key dates with less than 24h left.
 * Shows hours, minutes, seconds and updates every second.
 * Shows "Expired" when past due.
 */
export function KeyDateCountdown({ eventDate }: { eventDate: string }) {
  const [diffMs, setDiffMs] = useState(() => getDiffMs(eventDate));

  useEffect(() => {
    setDiffMs(getDiffMs(eventDate));
    const id = setInterval(() => {
      const next = getDiffMs(eventDate);
      setDiffMs(next);
    }, 1000);
    return () => clearInterval(id);
  }, [eventDate]);

  const isPast = diffMs <= 0;
  const isWithin24h = diffMs > 0 && diffMs < ONE_DAY_MS;

  if (isPast) {
    return (
      <span className="rounded-full bg-stone-200 px-2 py-0.5 text-xs font-medium text-stone-600">
        Expired
      </span>
    );
  }

  if (isWithin24h) {
    return (
      <span className="rounded-full bg-amber-200 px-2 py-0.5 text-xs font-medium text-amber-800 tabular-nums">
        {formatCountdown(diffMs)}
      </span>
    );
  }

  const days = Math.ceil(diffMs / ONE_DAY_MS);
  return (
    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">
      {days} day{days === 1 ? "" : "s"} left
    </span>
  );
}
