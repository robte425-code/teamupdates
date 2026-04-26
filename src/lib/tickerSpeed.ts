export const TICKER_SPEED_MIN_PPS = 8;
export const TICKER_SPEED_MAX_PPS = 120;
export const TICKER_SPEED_DEFAULT_PPS = 40;

export function clampTickerSpeedPxPerSec(n: number): number {
  const r = Math.round(Number(n));
  if (!Number.isFinite(r)) return TICKER_SPEED_DEFAULT_PPS;
  return Math.min(TICKER_SPEED_MAX_PPS, Math.max(TICKER_SPEED_MIN_PPS, r));
}
