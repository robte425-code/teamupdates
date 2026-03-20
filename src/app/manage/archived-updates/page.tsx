import { UpdatesSection } from "@/components/UpdatesSection";

export default function ArchivedUpdatesPage() {
  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-stone-900">
        Archived Updates and Reminders
      </h1>
      <UpdatesSection showAddForm={false} variant="archived" />
    </div>
  );
}
