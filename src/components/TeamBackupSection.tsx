"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { TeamBackupAppId } from "@/lib/teamBackupApps";

type BackupFile = {
  id: string;
  name: string;
  appId: TeamBackupAppId | null;
  size: number;
  createdAt: string;
  webUrl: string;
};

type BackupApp = {
  id: TeamBackupAppId;
  name: string;
  extension: string;
};

type HubState = {
  apps: BackupApp[];
  backups: BackupFile[];
  errors: string[];
};

function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function TeamBackupSection() {
  const [state, setState] = useState<HubState>({ apps: [], backups: [], errors: [] });
  const [loading, setLoading] = useState(true);
  const [allBusy, setAllBusy] = useState(false);
  const [appBusy, setAppBusy] = useState<TeamBackupAppId | null>(null);
  const [restoreBusy, setRestoreBusy] = useState<TeamBackupAppId | null>(null);
  const [selectedBackup, setSelectedBackup] = useState<Record<TeamBackupAppId, string>>({
    dashboard: "",
    requests: "",
    voc: "",
    payroll: "",
    hr: "",
  });
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const backupsByApp = useMemo(() => {
    const map = new Map<TeamBackupAppId, BackupFile[]>();
    for (const app of state.apps) {
      map.set(
        app.id,
        state.backups.filter((b) => b.appId === app.id)
      );
    }
    return map;
  }, [state.apps, state.backups]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/team-backup", { cache: "no-store" });
      const data = (await res.json()) as HubState;
      if (!res.ok) throw new Error("Could not load backups");
      setState(data);
      setSelectedBackup((prev) => {
        const next = { ...prev };
        for (const app of data.apps) {
          const files = data.backups.filter((b) => b.appId === app.id);
          if (!next[app.id] || !files.some((f) => f.id === next[app.id])) {
            next[app.id] = files[0]?.id ?? "";
          }
        }
        return next;
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load backups");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function runBackup(appIds?: TeamBackupAppId[]) {
    setMessage(null);
    setError(null);
    if (appIds?.length === 1) {
      setAppBusy(appIds[0]!);
    } else {
      setAllBusy(true);
    }

    try {
      const res = await fetch("/api/team-backup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(appIds ? { apps: appIds } : {}),
      });
      const data = (await res.json()) as {
        results?: Array<{ appName: string; ok: boolean; filename?: string; error?: string }>;
        errors?: string[];
      };
      if (!res.ok) throw new Error("Backup request failed");

      const failed = (data.results ?? []).filter((r) => !r.ok);
      const succeeded = (data.results ?? []).filter((r) => r.ok);
      const configErrors = data.errors ?? [];

      if (configErrors.length > 0) {
        setError(configErrors.join(" "));
      } else if (failed.length > 0) {
        setError(failed.map((r) => `${r.appName}: ${r.error}`).join(" "));
      }

      if (succeeded.length > 0) {
        setMessage(
          succeeded.length === 1
            ? `${succeeded[0]!.appName} backup saved to SharePoint as ${succeeded[0]!.filename}.`
            : `${succeeded.length} app backups saved to SharePoint Backups folder.`
        );
      }

      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Backup failed");
    } finally {
      setAllBusy(false);
      setAppBusy(null);
    }
  }

  async function runRestore(appId: TeamBackupAppId) {
    const backupId = selectedBackup[appId];
    const app = state.apps.find((a) => a.id === appId);
    if (!backupId || !app) {
      setError(`Choose a ${app?.name ?? "app"} backup to restore.`);
      setMessage(null);
      return;
    }

    if (
      !confirm(
        `Restore ${app.name} from the selected SharePoint backup? This replaces that app's current database data.`
      )
    ) {
      return;
    }

    setRestoreBusy(appId);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch("/api/team-backup/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ app: appId, backupId }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error || "Restore failed");
      setMessage(`${app.name} restore complete.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Restore failed");
    } finally {
      setRestoreBusy(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="max-w-3xl text-sm text-stone-600">
          Backups are stored in the TEAM SharePoint site under the <strong>Backups</strong> folder.
          Each file is named <code className="rounded bg-stone-100 px-1">App name-YYYY-MM-DD HH-mm-ss</code>.
          HR backups include database rows and Vercel Blob document files. Voc hotline backups
          include uploaded RAG source files.
        </p>
      </div>

      {(state.errors.length > 0 || error) && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          {[...state.errors, ...(error ? [error] : [])].map((msg) => (
            <p key={msg}>{msg}</p>
          ))}
        </div>
      )}

      {message && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          {message}
        </div>
      )}

      <section className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
        <h2 className="mb-2 text-lg font-semibold text-stone-900">Backup all apps</h2>
        <p className="mb-4 text-sm text-stone-600">
          Create fresh backups for Dashboard, Requests, Voc hotline, Payroll, and HR, then upload
          them to SharePoint.
        </p>
        <button
          type="button"
          disabled={loading || allBusy || appBusy !== null}
          onClick={() => runBackup()}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
        >
          {allBusy ? "Backing up all apps..." : "Backup all apps"}
        </button>
      </section>

      <section className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-stone-900">App backups</h2>
        {loading ? (
          <p className="text-sm text-stone-500">Loading SharePoint backups...</p>
        ) : (
          <div className="space-y-4">
            {state.apps.map((app) => {
              const files = backupsByApp.get(app.id) ?? [];
              return (
                <div
                  key={app.id}
                  className="rounded-lg border border-stone-200 p-4"
                >
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-base font-semibold text-stone-900">{app.name}</h3>
                    <button
                      type="button"
                      disabled={loading || allBusy || appBusy !== null || restoreBusy !== null}
                      onClick={() => runBackup([app.id])}
                      className="rounded-lg bg-stone-800 px-3 py-2 text-sm font-medium text-white hover:bg-stone-700 disabled:opacity-60"
                    >
                      {appBusy === app.id ? "Backing up..." : "Backup"}
                    </button>
                  </div>

                  <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
                    <label className="block flex-1 text-sm">
                      <span className="mb-1 block font-medium text-stone-700">
                        SharePoint backup to restore
                      </span>
                      <select
                        value={selectedBackup[app.id]}
                        onChange={(e) =>
                          setSelectedBackup((prev) => ({ ...prev, [app.id]: e.target.value }))
                        }
                        disabled={files.length === 0 || restoreBusy !== null}
                        className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm disabled:bg-stone-100"
                      >
                        {files.length === 0 ? (
                          <option value="">No backups yet</option>
                        ) : (
                          files.map((file) => (
                            <option key={file.id} value={file.id}>
                              {file.name} ({formatWhen(file.createdAt)}, {formatSize(file.size)})
                            </option>
                          ))
                        )}
                      </select>
                    </label>
                    <button
                      type="button"
                      disabled={
                        files.length === 0 ||
                        !selectedBackup[app.id] ||
                        restoreBusy !== null ||
                        appBusy !== null ||
                        allBusy
                      }
                      onClick={() => runRestore(app.id)}
                      className="rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60"
                    >
                      {restoreBusy === app.id ? "Restoring..." : "Restore"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
