import { DatabaseBackupSection } from "@/components/DatabaseBackupSection";

export default function ManageBackupPage() {
  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-stone-900">Backup</h1>
      <DatabaseBackupSection />
    </div>
  );
}
