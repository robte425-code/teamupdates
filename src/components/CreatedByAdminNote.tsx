import { formatAddedByLine } from "@/lib/createdBy";

export function CreatedByAdminNote({
  name,
  email,
  className = "mt-1 text-xs text-stone-500",
}: {
  name?: string | null;
  email?: string | null;
  className?: string;
}) {
  const line = formatAddedByLine(name, email);
  if (!line) return null;
  return (
    <p className={className}>
      Added by <span className="font-medium text-stone-600">{line}</span>
    </p>
  );
}
