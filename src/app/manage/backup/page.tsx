import { BackupHubLayersOverview } from "@/components/BackupHubLayersOverview";
import { NeonBackupPanel } from "@/components/NeonBackupPanel";
import { TeamBackupSection } from "@/components/TeamBackupSection";

export default function ManageBackupPage() {
  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold text-stone-900">Backup hub</h1>
      <BackupHubLayersOverview />
      <TeamBackupSection />
      <NeonBackupPanel />
    </div>
  );
}
