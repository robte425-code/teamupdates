import { formatDateInPST } from "@/lib/formatKeyDate";
import { shouldShowUpdatedPill } from "@/lib/updateBadgeSettings";

export function UpdatedAdminBadge({
  showUpdatedPill,
  updatedAt,
  updatedPillDays,
}: {
  showUpdatedPill: boolean;
  updatedAt?: string | null;
  updatedPillDays: number;
}) {
  if (!shouldShowUpdatedPill(showUpdatedPill, updatedAt, updatedPillDays)) return null;
  return (
    <div className="mb-2 flex flex-wrap items-center gap-x-2 gap-y-1">
      <span className="inline-block rounded-full bg-emerald-600 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white sm:text-xs">
        Updated
      </span>
      <span className="text-xs text-stone-500">{formatDateInPST(updatedAt!)}</span>
    </div>
  );
}
