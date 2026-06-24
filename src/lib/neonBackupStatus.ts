import {
  createNeonSnapshot,
  formatHistoryRetention,
  formatScheduleSummary,
  getNeonBackupSchedule,
  getNeonProject,
  isNeonApiConfigured,
  listNeonBranches,
  listNeonSnapshots,
  snapshotCreatedAt,
  snapshotDisplayName,
  type NeonBackupScheduleItem,
} from "@/lib/neonApi";
import { NEON_BACKUP_TARGETS, type NeonBackupTarget } from "@/lib/neonBackupTargets";
import type { TeamBackupAppId } from "@/lib/teamBackupApps";

export type NeonAppBackupStatus = {
  appId: TeamBackupAppId;
  appName: string;
  neonProjectId: string | null;
  branchId: string | null;
  branchName: string | null;
  schedule: NeonBackupScheduleItem[];
  scheduleSummary: string;
  lastSnapshotAt: string | null;
  lastSnapshotName: string | null;
  snapshotCount: number;
  historyRetentionSeconds: number | null;
  historyRetentionLabel: string | null;
  error: string | null;
};

export type NeonBackupStatusResponse = {
  configured: boolean;
  fetchedAt: string;
  globalError?: string;
  apps: NeonAppBackupStatus[];
};

function isRootBranch(branch: { parent_id?: string | null }): boolean {
  return branch.parent_id == null;
}

async function resolveBranchId(
  target: NeonBackupTarget,
  projectDefaultBranchId?: string
): Promise<{ branchId: string | null; branchName: string | null }> {
  if (!target.neonProjectId) {
    return { branchId: null, branchName: null };
  }

  const branches = await listNeonBranches(target.neonProjectId);
  if (branches.length === 0) {
    return { branchId: null, branchName: null };
  }

  // Snapshot schedules are configured on the project default / root branch.
  // Prefer Neon’s default branch over a hardcoded branch ID (used only for deep links).
  if (projectDefaultBranchId) {
    const byDefault = branches.find((b) => b.id === projectDefaultBranchId);
    if (byDefault) return { branchId: byDefault.id, branchName: byDefault.name };
  }

  const rootByName = branches.find((b) => b.name === target.rootBranch && isRootBranch(b));
  if (rootByName) return { branchId: rootByName.id, branchName: rootByName.name };

  const byName = branches.find((b) => b.name === target.rootBranch);
  if (byName) return { branchId: byName.id, branchName: byName.name };

  const rootBranch = branches.find(isRootBranch);
  if (rootBranch) return { branchId: rootBranch.id, branchName: rootBranch.name };

  if (target.neonBranchId) {
    const byConfigured = branches.find((b) => b.id === target.neonBranchId);
    if (byConfigured) {
      return { branchId: byConfigured.id, branchName: byConfigured.name };
    }
  }

  const primary = branches.find((b) => b.primary || b.default);
  if (primary) return { branchId: primary.id, branchName: primary.name };

  return { branchId: branches[0]?.id ?? null, branchName: branches[0]?.name ?? null };
}

async function fetchAppStatus(target: NeonBackupTarget): Promise<NeonAppBackupStatus> {
  const base: NeonAppBackupStatus = {
    appId: target.id,
    appName: target.name,
    neonProjectId: target.neonProjectId,
    branchId: target.neonBranchId,
    branchName: target.rootBranch,
    schedule: [],
    scheduleSummary: "Unknown",
    lastSnapshotAt: null,
    lastSnapshotName: null,
    snapshotCount: 0,
    historyRetentionSeconds: null,
    historyRetentionLabel: null,
    error: null,
  };

  if (!target.neonProjectId) {
    return { ...base, error: "Neon project ID is not configured." };
  }

  try {
    const project = await getNeonProject(target.neonProjectId);
    const { branchId, branchName } = await resolveBranchId(target, project.default_branch_id);
    if (!branchId) {
      return { ...base, error: "Could not resolve production branch ID." };
    }

    const [schedule, snapshots] = await Promise.all([
      getNeonBackupSchedule(target.neonProjectId, branchId),
      listNeonSnapshots(target.neonProjectId),
    ]);

    const branchSnapshots = snapshots.filter(
      (s) => !s.source_branch_id || s.source_branch_id === branchId
    );
    const sorted = [...branchSnapshots].sort((a, b) => {
      const aTime = snapshotCreatedAt(a) ?? "";
      const bTime = snapshotCreatedAt(b) ?? "";
      return bTime.localeCompare(aTime);
    });
    const latest = sorted[0];

    return {
      ...base,
      branchId,
      branchName,
      schedule,
      scheduleSummary: formatScheduleSummary(schedule),
      lastSnapshotAt: latest ? snapshotCreatedAt(latest) : null,
      lastSnapshotName: latest ? snapshotDisplayName(latest) : null,
      snapshotCount: branchSnapshots.length,
      historyRetentionSeconds: project.history_retention_seconds ?? null,
      historyRetentionLabel: formatHistoryRetention(project.history_retention_seconds),
    };
  } catch (err) {
    return {
      ...base,
      error: err instanceof Error ? err.message : "Could not load Neon status",
    };
  }
}

export async function fetchNeonBackupStatus(): Promise<NeonBackupStatusResponse> {
  const fetchedAt = new Date().toISOString();

  if (!isNeonApiConfigured()) {
    return {
      configured: false,
      fetchedAt,
      globalError: "Set NEON_API_KEY on Updates to load live Neon snapshot status.",
      apps: NEON_BACKUP_TARGETS.map((target) => ({
        appId: target.id,
        appName: target.name,
        neonProjectId: target.neonProjectId,
        branchId: target.neonBranchId,
        branchName: target.rootBranch,
        schedule: [],
        scheduleSummary: "Unknown",
        lastSnapshotAt: null,
        lastSnapshotName: null,
        snapshotCount: 0,
        historyRetentionSeconds: null,
        historyRetentionLabel: null,
        error: null,
      })),
    };
  }

  const apps = await Promise.all(NEON_BACKUP_TARGETS.map((target) => fetchAppStatus(target)));
  return { configured: true, fetchedAt, apps };
}

export async function createAppNeonSnapshot(appId: TeamBackupAppId): Promise<{
  appId: TeamBackupAppId;
  snapshotId?: string;
  operationId?: string;
  createdAt?: string;
}> {
  const target = NEON_BACKUP_TARGETS.find((t) => t.id === appId);
  if (!target?.neonProjectId) {
    throw new Error(`No Neon project configured for ${appId}.`);
  }

  const project = await getNeonProject(target.neonProjectId);
  const { branchId } = await resolveBranchId(target, project.default_branch_id);
  if (!branchId) {
    throw new Error(`Could not resolve branch for ${target.name}.`);
  }

  const stamp = new Date().toISOString().slice(0, 16).replace("T", " ");
  const result = await createNeonSnapshot(
    target.neonProjectId,
    branchId,
    `Backup hub ${target.name} ${stamp}`
  );

  return {
    appId,
    snapshotId: result.snapshot?.id,
    operationId: result.operation_id,
    createdAt: snapshotCreatedAt(result.snapshot) ?? undefined,
  };
}
