export const KEY_DATE_BADGE_NEW_DEFAULT = 3;
export const KEY_DATE_BADGE_SOON_DEFAULT = 7;
export const KEY_DATE_BADGE_MAX_DAYS = 365;
export const KEY_DATE_BADGE_SETTINGS_ID = "default" as const;

export function clampKeyDateBadgeDays(n: unknown, whenInvalid: number): number {
  const num = typeof n === "number" ? n : Number(n);
  const rounded = Number.isFinite(num) ? Math.round(num) : whenInvalid;
  return Math.min(Math.max(rounded, 0), KEY_DATE_BADGE_MAX_DAYS);
}
