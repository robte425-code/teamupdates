export const UPDATE_BADGE_DAYS_DEFAULT = 4;
export const UPDATE_BADGE_MAX_DAYS = 365;
export const UPDATE_BADGE_SETTINGS_ID = "default" as const;

export function clampUpdateBadgeDays(n: unknown, whenInvalid: number): number {
  const num = typeof n === "number" ? n : Number(n);
  const rounded = Number.isFinite(num) ? Math.round(num) : whenInvalid;
  return Math.min(Math.max(rounded, 0), UPDATE_BADGE_MAX_DAYS);
}

/** True when the Updated pill should show (0 days = never). */
export function isUpdateWithinUpdatedBadgeWindow(
  contentUpdatedAt: string | Date | null | undefined,
  updatedBadgeDays: number,
  nowMs: number = Date.now()
): boolean {
  if (!contentUpdatedAt || updatedBadgeDays <= 0) return false;
  const updatedMs = new Date(contentUpdatedAt).getTime();
  if (!Number.isFinite(updatedMs)) return false;
  const windowMs = updatedBadgeDays * 24 * 60 * 60 * 1000;
  return updatedMs >= nowMs - windowMs;
}
