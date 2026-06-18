import { DashboardVisitHistory } from "@/components/DashboardVisitHistory";

export default function UsageStatsPage() {
  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-stone-900">Usage stats</h1>
      <section>
        <h2 className="mb-4 text-lg font-semibold text-stone-900">Visit history</h2>
        <DashboardVisitHistory />
      </section>
    </div>
  );
}
