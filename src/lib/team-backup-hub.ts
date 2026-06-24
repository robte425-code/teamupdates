import { teamUrls } from "@team/shell/nav-config";
import {
  executeBackupSql,
  generateBackupSql,
  isValidBackupSql,
} from "@/lib/databaseBackup";
import {
  downloadSharePointBackup,
  isSharePointConfigured,
  listSharePointBackups,
  uploadSharePointBackup,
  type SharePointBackupFile,
} from "@/lib/sharepointBackups";
import {
  TEAM_BACKUP_APPS,
  buildBackupFilename,
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

function internalBackupUrl(appId: TeamBackupAppId): string | null {
  if (appId === "dashboard") return null;
  const urls = teamUrls();
  const bases: Record<Exclude<TeamBackupAppId, "dashboard">, string> = {
    requests: urls.requests,
    hr: urls.hr,
    payroll: urls.payroll.replace(/\/my-leave\.html$/, ""),
    voc: urls.vocHotline,
  };
  return `${bases[appId]}/api/internal/database-backup`;
}

async function fetchRemoteBackup(app: TeamBackupApp): Promise<Buffer> {
  const secret = internalSecret();
  const url = internalBackupUrl(app.id);
  if (!secret || !url) {
    throw new Error(`${app.name}: TEAM_INTERNAL_ACCESS_SECRET or app URL not configured`);
  }

  const fetchUrl = app.id === "voc" ? `${url}?files=1` : url;
  const res = await fetch(fetchUrl, {
    headers: { Authorization: `Bearer ${secret}` },
    cache: "no-store",
  });

  if (!res.ok) {
    const payload = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(payload.error || `${app.name}: backup failed (${res.status})`);
  }

  return Buffer.from(await res.arrayBuffer());
}

async function createLocalBackup(app: TeamBackupApp): Promise<Buffer> {
  if (app.id !== "dashboard") {
    return fetchRemoteBackup(app);
  }
  const sql = await generateBackupSql();
  return Buffer.from(sql, "utf8");
}

async function restoreLocalBackup(app: TeamBackupApp, content: Buffer): Promise<void> {
  if (app.id === "dashboard") {
    const sql = content.toString("utf8");
    if (!isValidBackupSql(sql)) {
      throw new Error("Invalid Dashboard backup file.");
    }
    await executeBackupSql(sql);
    return;
  }

  const secret = internalSecret();
  const url = internalBackupUrl(app.id);
  if (!secret || !url) {
    throw new Error(`${app.name}: TEAM_INTERNAL_ACCESS_SECRET or app URL not configured`);
  }

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": app.contentType,
    },
    body: new Uint8Array(content),
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
      const content = await createLocalBackup(app);
      const filename = buildBackupFilename(app);
      await uploadSharePointBackup(filename, content, app.contentType);
      results.push({ appId: app.id, appName: app.name, ok: true, filename });
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
    const downloaded = await downloadSharePointBackup(backupId);
    const fileAppId = parseBackupAppId(downloaded.name);
    if (fileAppId !== appId) {
      return { error: `Selected backup does not match ${app.name}.` };
    }

    await restoreLocalBackup(app, downloaded.content);
    return { ok: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Restore failed" };
  }
}

export { TEAM_BACKUP_APPS };
