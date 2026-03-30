import { ManageKeyDatesContent } from "@/components/ManageKeyDatesContent";

export default function ArchivedKeyDatesPage() {
  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-stone-900">Archived key dates</h1>
      <ManageKeyDatesContent variant="archived" />
    </div>
  );
}
