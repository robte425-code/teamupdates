export type TeamBackupAppId = "dashboard" | "requests" | "voc" | "payroll" | "hr";

export type TeamBackupApp = {
  id: TeamBackupAppId;
  name: string;
  extension: string;
  contentType: string;
};

export const TEAM_BACKUP_APPS: TeamBackupApp[] = [
  { id: "dashboard", name: "Dashboard", extension: ".sql", contentType: "application/sql" },
  { id: "requests", name: "Requests", extension: ".sql", contentType: "application/sql" },
  { id: "voc", name: "Voc hotline", extension: ".zip", contentType: "application/zip" },
  { id: "payroll", name: "Payroll", extension: ".sql", contentType: "application/sql" },
  { id: "hr", name: "HR", extension: ".zip", contentType: "application/zip" },
];

export function getTeamBackupApp(id: TeamBackupAppId): TeamBackupApp {
  const app = TEAM_BACKUP_APPS.find((a) => a.id === id);
  if (!app) throw new Error(`Unknown backup app: ${id}`);
  return app;
}

/** `<App name>-<YYYY-MM-DD HH-mm-ss><extension>` */
export function buildBackupFilename(app: TeamBackupApp, date = new Date()): string {
  const iso = date.toISOString().slice(0, 19);
  const [day, time] = iso.split("T");
  const stamp = `${day} ${time.replace(/:/g, "-")}`;
  return `${app.name}-${stamp}${app.extension}`;
}

export function parseBackupAppId(filename: string): TeamBackupAppId | null {
  for (const app of [...TEAM_BACKUP_APPS].sort((a, b) => b.name.length - a.name.length)) {
    if (filename.startsWith(`${app.name}-`) && filename.endsWith(app.extension)) {
      return app.id;
    }
  }
  if (
    (filename.startsWith("HR-") || filename.startsWith("team-hr-backup")) &&
    filename.endsWith(".json")
  ) {
    return "hr";
  }
  return null;
}
