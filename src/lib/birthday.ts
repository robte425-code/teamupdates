import { APP_TIMEZONE } from "@/lib/formatKeyDate";

export function clampBirthdayMonth(value: number): number {
  const n = Math.floor(Number(value));
  if (!Number.isFinite(n)) return 1;
  return Math.min(12, Math.max(1, n));
}

export function clampBirthdayDay(value: number): number {
  const n = Math.floor(Number(value));
  if (!Number.isFinite(n)) return 1;
  return Math.min(31, Math.max(1, n));
}

export function firstName(fullName: string): string {
  const trimmed = fullName.trim();
  return trimmed.split(/\s+/)[0] ?? trimmed;
}

export function todayMonthDayInPacific(now: Date = new Date()): { month: number; day: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: APP_TIMEZONE,
    month: "numeric",
    day: "numeric",
  }).formatToParts(now);
  const month = Number(parts.find((p) => p.type === "month")?.value ?? "1");
  const day = Number(parts.find((p) => p.type === "day")?.value ?? "1");
  return {
    month: clampBirthdayMonth(month),
    day: clampBirthdayDay(day),
  };
}
