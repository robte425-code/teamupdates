/** Fired on `window` so TickerBar refetches after manage-ticker mutations. */
export const TICKER_REFRESH_EVENT = "team-ticker-refresh";

export function requestTickerRefresh() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(TICKER_REFRESH_EVENT));
  }
}
