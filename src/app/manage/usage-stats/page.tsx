import { UsageStatsContent } from "@/components/UsageStatsContent";
import { DatabaseBackupSection } from "@/components/DatabaseBackupSection";

export default function UsageStatsPage() {
  return (
    <div>
      <h1 className="mb-4 text-2xl font-semibold text-stone-900">Usage stats</h1>
      <DatabaseBackupSection />
      <UsageStatsContent />
    </div>
  );
}

