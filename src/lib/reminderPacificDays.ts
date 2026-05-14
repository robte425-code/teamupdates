import { APP_TIMEZONE } from "@/lib/formatKeyDate";

/** Whole calendar days from `from` to `to` in Pacific (en-CA dates), both inclusive of the calendar day of `from` as day 0. */
export function pacificCalendarDaysBetween(from: Date, to: Date): number {
  const d0 = from.toLocaleDateString("en-CA", { timeZone: APP_TIMEZONE });
  const d1 = to.toLocaleDateString("en-CA", { timeZone: APP_TIMEZONE });
  const t0 = Date.parse(`${d0}T12:00:00`);
  const t1 = Date.parse(`${d1}T12:00:00`);
  if (!Number.isFinite(t0) || !Number.isFinite(t1)) {
    return Math.floor((to.getTime() - from.getTime()) / 86_400_000);
  }
  return Math.floor((t1 - t0) / 86_400_000);
}
