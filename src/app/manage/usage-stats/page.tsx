import { UsageStatsContent } from "@/components/UsageStatsContent";

export default function UsageStatsPage() {
  return (
    <div>
      <h1 className="mb-4 text-2xl font-semibold text-stone-900">Usage stats from the past 60 days</h1>
      <UsageStatsContent />
    </div>
  );
}

