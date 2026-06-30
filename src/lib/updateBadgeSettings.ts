export const UPDATE_PILL_DAYS_DEFAULT = 4;
export const UPDATE_PILL_MAX_DAYS = 365;

export function clampUpdatePillDays(n: unknown, whenInvalid: number): number {
  const num = typeof n === "number" ? n : Number(n);
  const rounded = Number.isFinite(num) ? Math.round(num) : whenInvalid;
  return Math.min(Math.max(rounded, 0), UPDATE_PILL_MAX_DAYS);
}

/** True when the Updated pill should show for this item. */
export function shouldShowUpdatedPill(
  showUpdatedPill: boolean,
  contentUpdatedAt: string | Date | null | undefined,
  updatedPillDays: number,
  nowMs: number = Date.now()
): boolean {
  if (!showUpdatedPill || updatedPillDays <= 0 || !contentUpdatedAt) return false;
  const updatedMs = new Date(contentUpdatedAt).getTime();
  if (!Number.isFinite(updatedMs)) return false;
  const windowMs = updatedPillDays * 24 * 60 * 60 * 1000;
  return updatedMs >= nowMs - windowMs;
}
