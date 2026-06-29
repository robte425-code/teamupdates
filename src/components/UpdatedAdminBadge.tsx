import { formatAddedByLine } from "@/lib/createdBy";
import { formatDateInPST } from "@/lib/formatKeyDate";
import { isUpdateWithinUpdatedBadgeWindow } from "@/lib/updateBadgeSettings";

export function UpdatedAdminBadge({
  updatedAt,
  name,
  email,
  updatedBadgeDays,
}: {
  updatedAt?: string | null;
  name?: string | null;
  email?: string | null;
  updatedBadgeDays: number;
}) {
  if (!isUpdateWithinUpdatedBadgeWindow(updatedAt, updatedBadgeDays)) return null;
  const byLine = formatAddedByLine(name, email);
  return (
    <div className="mb-2 flex flex-wrap items-center gap-x-2 gap-y-1">
      <span className="inline-block rounded-full bg-emerald-600 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white sm:text-xs">
        Updated
      </span>
      <span className="text-xs text-stone-500">
        {formatDateInPST(updatedAt!)}
        {byLine && (
          <>
            {" "}
            · by <span className="font-medium text-stone-600">{byLine}</span>
          </>
        )}
      </span>
    </div>
  );
}
