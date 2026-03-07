/**
 * Application timezone: Pacific Time (PST/PDT).
 */
export const APP_TIMEZONE = "America/Los_Angeles";

/**
 * Get (UTC - Pacific) offset in minutes for a given date (for DST).
 */
function getPacificOffsetMinutes(date: Date): number {
  const str = date.toLocaleString("en-US", {
    timeZone: APP_TIMEZONE,
    timeZoneName: "longOffset",
  });
  // Match "GMT-07:00" or "GMT-7" or "-07:00"
  const match = str.match(/GMT?([+-])(\d{1,2})(?::(\d{2}))?/);
  if (!match) return -480; // fallback PST
  const sign = match[1] === "+" ? 1 : -1;
  const hours = parseInt(match[2], 10);
  const minutes = match[3] ? parseInt(match[3], 10) : 0;
  return sign * (hours * 60 + minutes);
}

/**
 * Build an ISO string for the given date and time interpreted in Pacific.
 * Use this when saving key dates so 12:00 stays 12:00 in display (PST/PDT).
 */
export function dateTimeInPacificToISO(dateStr: string, timeStr: string): string {
  const probe = new Date(`${dateStr}T12:00:00.000Z`);
  const offsetMin = getPacificOffsetMinutes(probe);
  const sign = offsetMin <= 0 ? "-" : "+";
  const absMin = Math.abs(offsetMin);
  const hours = Math.floor(absMin / 60);
  const minutes = absMin % 60;
  const tz = `${sign}${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
  return `${dateStr}T${timeStr}:00${tz}`;
}

const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const ONE_HOUR_MS = 60 * 60 * 1000;
const ONE_MINUTE_MS = 60 * 1000;

/**
 * Format key date for display in PST, always including time.
 */
export function formatKeyDateDisplay(eventDate: string): string {
  const d = new Date(eventDate);
  if (Number.isNaN(d.getTime())) return eventDate;
  const datePart = new Intl.DateTimeFormat("en-US", {
    timeZone: APP_TIMEZONE,
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(d);
  const timePart = new Intl.DateTimeFormat("en-US", {
    timeZone: APP_TIMEZONE,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(d);
  return `${datePart} at ${timePart}`;
}

export type TimeLeftResult = {
  label: string;
  isPast: boolean;
  isDueWithin24h: boolean;
};

/**
 * Get human-readable "time left" or "time ago" for a key date.
 * When less than 1 day left, returns hours and minutes.
 */
/**
 * Format a date in PST (date only, for updates "posted on").
 */
export function formatDateInPST(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN((d as Date).getTime())) return String(date);
  return new Intl.DateTimeFormat("en-US", {
    timeZone: APP_TIMEZONE,
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(d as Date);
}

export function formatTimeLeft(eventDate: string): TimeLeftResult {
  const d = new Date(eventDate);
  const now = Date.now();
  const diffMs = d.getTime() - now;

  if (diffMs < 0) {
    return {
      label: "Expired",
      isPast: true,
      isDueWithin24h: false,
    };
  }

  if (diffMs < ONE_DAY_MS) {
    const hours = Math.floor(diffMs / ONE_HOUR_MS);
    const minutes = Math.floor((diffMs % ONE_HOUR_MS) / ONE_MINUTE_MS);
    const label =
      hours > 0
        ? `${hours} ${hours === 1 ? "hr" : "hrs"} ${minutes} min left`
        : `${minutes} ${minutes === 1 ? "min" : "mins"} left`;
    return {
      label,
      isPast: false,
      isDueWithin24h: true,
    };
  }

  const days = Math.ceil(diffMs / ONE_DAY_MS);
  return {
    label: `${days} day${days === 1 ? "" : "s"} left`,
    isPast: false,
    isDueWithin24h: false,
  };
}
