import { format } from "date-fns";

/**
 * Format key date for display, always including time.
 * Handles both full ISO strings and date-only strings (shows 12:00 AM for date-only).
 */
export function formatKeyDateDisplay(eventDate: string): string {
  const d = new Date(eventDate);
  if (Number.isNaN(d.getTime())) return eventDate;
  return format(d, "MMM d, yyyy 'at' h:mm a");
}
