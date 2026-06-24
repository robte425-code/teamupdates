import type { TeamBackupAppId } from "@/lib/teamBackupApps";

/** Vercel team slug (Storage → Open in Neon links). */
export const VERCEL_TEAM_SLUG = "robert-evans-projects-bb7ab988";

export type NeonBackupTargetId = TeamBackupAppId;

export type NeonBackupTarget = {
  id: NeonBackupTargetId;
  /** Display name aligned with backup hub app names where applicable. */
  name: string;
  vercelProject: string;
  /** Neon project ID (slug in console URL, e.g. wild-field-33261619). Not a branch ID (br-…). */
  neonProjectId: string | null;
  /** Optional production root branch ID for deep links (br-… from Neon Console). */
  neonBranchId: string | null;
  /** Hostname fragment for identification when project ID is not in env. */
  neonEndpointHint: string | null;
  /** Production root branch name in Neon (schedules apply here only). */
  rootBranch: string;
  snapshotSchedule: "daily" | "weekly" | "monthly";
  /** Shown in Backup hub; reflects Neon Console schedule configuration. */
  snapshotScheduleEnabled: boolean;
  coveredByBackupHub: boolean;
  notes?: string;
};

/** Backup-hub apps plus related Neon databases. */
export const NEON_BACKUP_TARGETS: NeonBackupTarget[] = [
  {
    id: "dashboard",
    name: "Dashboard",
    vercelProject: "teamvoc-updates",
    neonProjectId: "wild-field-33261619",
    neonBranchId: null,
    neonEndpointHint: "ep-hidden-union-akqrv9j9",
    rootBranch: "main",
    snapshotSchedule: "daily",
    snapshotScheduleEnabled: true,
    coveredByBackupHub: true,
  },
  {
    id: "requests",
    name: "Requests",
    vercelProject: "team-requests",
    neonProjectId: "dry-union-01175938",
    neonBranchId: "br-billowing-mountain-afdjswm8",
    neonEndpointHint: "ep-falling-frog-af76gebl",
    rootBranch: "main",
    snapshotSchedule: "daily",
    snapshotScheduleEnabled: true,
    coveredByBackupHub: true,
  },
  {
    id: "payroll",
    name: "Payroll",
    vercelProject: "team-payroll",
    neonProjectId: "small-pine-63697790",
    neonBranchId: null,
    neonEndpointHint: "ep-muddy-surf-akmqv5zc",
    rootBranch: "main",
    snapshotSchedule: "daily",
    snapshotScheduleEnabled: true,
    coveredByBackupHub: true,
  },
  {
    id: "hr",
    name: "HR",
    vercelProject: "team-hr",
    neonProjectId: "wandering-cell-75909874",
    neonBranchId: null,
    neonEndpointHint: "ep-autumn-sun-atno8xwy",
    rootBranch: "main",
    snapshotSchedule: "daily",
    snapshotScheduleEnabled: true,
    coveredByBackupHub: true,
    notes: "Neon covers Postgres only; HR document files still rely on SharePoint zip backups.",
  },
  {
    id: "voc",
    name: "Voc hotline (RAG)",
    vercelProject: "voc-hotline-nine",
    neonProjectId: "muddy-waterfall-70578638",
    neonBranchId: "br-icy-fog-a6uazw7v",
    neonEndpointHint: "ep-shy-night-a6pkwiip",
    rootBranch: "main",
    snapshotSchedule: "daily",
    snapshotScheduleEnabled: true,
    coveredByBackupHub: true,
  },
];

export function vercelStorageUrl(vercelProject: string): string {
  return `https://vercel.com/${VERCEL_TEAM_SLUG}/${vercelProject}/stores`;
}

export function neonConsoleProjectUrl(projectId: string): string {
  return `https://console.neon.tech/app/projects/${projectId}`;
}

export function neonConsoleBackupUrl(projectId: string): string {
  return `${neonConsoleProjectUrl(projectId)}/branches`;
}

export function neonConsoleBranchUrl(projectId: string, branchId: string): string {
  return `${neonConsoleProjectUrl(projectId)}/branches/${branchId}`;
}

export function primaryNeonLink(target: NeonBackupTarget): {
  href: string;
  label: string;
} {
  if (target.neonProjectId && target.neonBranchId) {
    return {
      href: neonConsoleBranchUrl(target.neonProjectId, target.neonBranchId),
      label: "Open in Neon Console",
    };
  }
  if (target.neonProjectId) {
    return {
      href: neonConsoleBackupUrl(target.neonProjectId),
      label: "Open in Neon Console",
    };
  }
  return {
    href: vercelStorageUrl(target.vercelProject),
    label: "Open in Vercel Storage",
  };
}
