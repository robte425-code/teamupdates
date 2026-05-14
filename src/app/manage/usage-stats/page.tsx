import Link from "next/link";
import { DatabaseBackupSection } from "@/components/DatabaseBackupSection";

export default function UsageStatsPage() {
  return (
    <div>
      <h1 className="mb-4 text-2xl font-semibold text-stone-900">Usage stats</h1>
      <DatabaseBackupSection />
      <p className="mt-8 text-sm text-stone-600">
        Dashboard visit history and inactive-user reminders live on{" "}
        <Link href="/manage/reminders" className="font-medium text-emerald-700 underline hover:text-emerald-800">
          Reminders
        </Link>
        .
      </p>
    </div>
  );
}
