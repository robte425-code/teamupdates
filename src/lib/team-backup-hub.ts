import { teamUrls } from "@team/shell/nav-config";
import {
  getSharePointBackupName,
  isSharePointConfigured,
  listSharePointBackups,
  type SharePointBackupFile,
} from "@/lib/sharepointBackups";
import {
  TEAM_BACKUP_APPS,
  getTeamBackupApp,
  parseBackupAppId,
  type TeamBackupApp,
  type TeamBackupAppId,
} from "@/lib/teamBackupApps";

export type BackupRunResult = {
  appId: TeamBackupAppId;
  appName: string;
  ok: boolean;
  filename?: string;
  error?: string;
};

function internalSecret(): string | null {
  const secret = process.env.TEAM_INTERNAL_ACCESS_SECRET?.trim();
  return secret || null;
}

function internalBackupUrl(appId: TeamBackupAppId): string {
  const urls = teamUrls();
  const bases: Record<TeamBackupAppId, string> = {
    dashboard: urls.updates,
    requests: urls.requests,
    hr: urls.hr,
    payroll: urls.payroll.replace(/\/my-leave\.html$/, ""),
    voc: urls.vocHotline,
  };
  return `${bases[appId]}/api/internal/database-backup`;
}

async function triggerSharePointBackup(app: TeamBackupApp): Promise<{ filename: string }> {
  const secret = internalSecret();
  if (!secret) {
    throw new Error(`${app.name}: TEAM_INTERNAL_ACCESS_SECRET is not configured`);
  }

  const url = new URL(internalBackupUrl(app.id));
  url.searchParams.set("target", "sharepoint");
  if (app.id === "voc") {
    url.searchParams.set("files", "1");
  }

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${secret}` },
    cache: "no-store",
  });

  const payload = (await res.json().catch(() => ({}))) as {
    ok?: boolean;
    filename?: string;
    error?: string;
  };

  if (!res.ok || !payload.filename) {
    throw new Error(payload.error || `${app.name}: SharePoint backup failed (${res.status})`);
  }

  return { filename: payload.filename };
}

async function restoreFromSharePoint(app: TeamBackupApp, backupId: string): Promise<void> {
  const secret = internalSecret();
  if (!secret) {
    throw new Error(`${app.name}: TEAM_INTERNAL_ACCESS_SECRET is not configured`);
  }

  const res = await fetch(internalBackupUrl(app.id), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ source: "sharepoint", backupId }),
  });

  if (!res.ok) {
    const payload = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(payload.error || `${app.name}: restore failed (${res.status})`);
  }
}

export async function listTeamBackups(): Promise<{
  apps: TeamBackupApp[];
  backups: SharePointBackupFile[];
  errors: string[];
}> {
  const errors: string[] = [];
  if (!isSharePointConfigured()) {
    errors.push("SHAREPOINT_SITE_URL is not configured on Updates");
    return { apps: TEAM_BACKUP_APPS, backups: [], errors };
  }

  try {
    const backups = await listSharePointBackups();
    return { apps: TEAM_BACKUP_APPS, backups, errors };
  } catch (err) {
    errors.push(err instanceof Error ? err.message : "Could not list SharePoint backups");
    return { apps: TEAM_BACKUP_APPS, backups: [], errors };
  }
}

export async function runTeamBackup(appIds?: TeamBackupAppId[]): Promise<{
  results: BackupRunResult[];
  errors: string[];
}> {
  const errors: string[] = [];
  if (!isSharePointConfigured()) {
    return {
      results: [],
      errors: ["SHAREPOINT_SITE_URL is not configured on Updates"],
    };
  }
  if (!internalSecret()) {
    return {
      results: [],
      errors: ["TEAM_INTERNAL_ACCESS_SECRET is not configured on Updates"],
    };
  }

  const targets = appIds?.length
    ? appIds.map((id) => getTeamBackupApp(id))
    : TEAM_BACKUP_APPS;

  const results: BackupRunResult[] = [];

  for (const app of targets) {
    try {
      const uploaded = await triggerSharePointBackup(app);
      results.push({ appId: app.id, appName: app.name, ok: true, filename: uploaded.filename });
    } catch (err) {
      results.push({
        appId: app.id,
        appName: app.name,
        ok: false,
        error: err instanceof Error ? err.message : "Backup failed",
      });
    }
  }

  return { results, errors };
}

export async function runTeamRestore(
  appId: TeamBackupAppId,
  backupId: string
): Promise<{ ok: true } | { error: string }> {
  if (!isSharePointConfigured()) {
    return { error: "SHAREPOINT_SITE_URL is not configured on Updates" };
  }
  if (!internalSecret()) {
    return { error: "TEAM_INTERNAL_ACCESS_SECRET is not configured on Updates" };
  }

  const app = getTeamBackupApp(appId);

  try {
    const name = await getSharePointBackupName(backupId);
    const fileAppId = parseBackupAppId(name);
    if (fileAppId !== appId) {
      return { error: `Selected backup does not match ${app.name}.` };
    }

    await restoreFromSharePoint(app, backupId);
    return { ok: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Restore failed" };
  }
}

export { TEAM_BACKUP_APPS };
