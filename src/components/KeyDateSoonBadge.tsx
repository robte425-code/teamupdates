"use client";

import { useLayoutEffect, useState } from "react";
import {
  getKeyDateSoonBadgeLabel,
  isKeyDateDueWithinSoonWindow,
} from "@/lib/formatKeyDate";

/**
 * SOON / TODAY badge. Label is computed after mount so it uses the viewer's
 * local clock and Pacific calendar (key dates are stored/displayed in Pacific).
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
  const [label, setLabel] = useState<"TODAY" | "SOON">("SOON");

  useLayoutEffect(() => {
    if (!isSoon) return;
    setLabel(getKeyDateSoonBadgeLabel(eventDate, eventEndDate));
  }, [isSoon, eventDate, eventEndDate, soonBadgeDays]);

  if (!isSoon) return null;

  return (
    <span className="inline-block rounded-full bg-amber-500 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white sm:text-xs">
      {label}
    </span>
  );
}
