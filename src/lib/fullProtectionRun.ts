import { isNeonApiConfigured } from "@/lib/neonApi";
import { createAppNeonSnapshot } from "@/lib/neonBackupStatus";
import { NEON_BACKUP_TARGETS } from "@/lib/neonBackupTargets";
import { runTeamBackup, type BackupRunResult } from "@/lib/team-backup-hub";
import type { TeamBackupAppId } from "@/lib/teamBackupApps";

export type NeonSnapshotRunResult = {
  appId: TeamBackupAppId;
  appName: string;
  ok: boolean;
  snapshotId?: string;
  createdAt?: string;
  error?: string;
};

export type FullProtectionRunResult = {
  sharePoint: BackupRunResult[];
  sharePointErrors: string[];
  neon: NeonSnapshotRunResult[];
  neonConfigured: boolean;
  neonSkippedReason?: string;
};

export async function runFullProtectionRun(): Promise<FullProtectionRunResult> {
  const sharePointRun = await runTeamBackup();
  const neonConfigured = isNeonApiConfigured();
  const neon: NeonSnapshotRunResult[] = [];

  if (!neonConfigured) {
    return {
      sharePoint: sharePointRun.results,
      sharePointErrors: sharePointRun.errors,
      neon,
      neonConfigured: false,
      neonSkippedReason: "NEON_API_KEY is not configured on Updates.",
    };
  }

  for (const target of NEON_BACKUP_TARGETS) {
    try {
      const created = await createAppNeonSnapshot(target.id);
      neon.push({
        appId: target.id,
        appName: target.name,
        ok: true,
        snapshotId: created.snapshotId,
        createdAt: created.createdAt,
      });
    } catch (err) {
      neon.push({
        appId: target.id,
        appName: target.name,
        ok: false,
        error: err instanceof Error ? err.message : "Neon snapshot failed",
      });
    }
  }

  return {
    sharePoint: sharePointRun.results,
    sharePointErrors: sharePointRun.errors,
    neon,
    neonConfigured: true,
  };
}
