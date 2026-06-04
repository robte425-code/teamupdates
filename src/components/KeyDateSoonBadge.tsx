"use client";

import { useSyncExternalStore } from "react";
import {
  getKeyDateSoonBadgeLabel,
  isKeyDateDueWithinSoonWindow,
} from "@/lib/formatKeyDate";

/**
 * SOON / TODAY badge. "Today" uses the viewer's local calendar day; computed on the
 * client so SSR (UTC on Vercel) does not show SOON when the browser would say TODAY.
 */
export function KeyDateSoonBadge({
  eventDate,
  eventEndDate,
  soonBadgeDays,
}: {
  eventDate: string;
  eventEndDate?: string | null;
  soonBadgeDays: number;
}) {
  const isSoon = isKeyDateDueWithinSoonWindow(eventDate, soonBadgeDays);

  const isToday = useSyncExternalStore(
    () => () => {},
    () => getKeyDateSoonBadgeLabel(eventDate, eventEndDate) === "TODAY",
    () => false
  );

  if (!isSoon) return null;

  return (
    <span className="inline-block rounded-full bg-amber-500 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white sm:text-xs">
      {isToday ? "TODAY" : "SOON"}
    </span>
  );
}
