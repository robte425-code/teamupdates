"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { dispatchBackupHubRefreshNeon } from "@/lib/backupHubEvents";
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

type BackupResult = {
  appId: TeamBackupAppId;
  appName: string;
  ok: boolean;
  filename?: string;
  error?: string;
};

type AppBackupStepStatus = "pending" | "running" | "done" | "failed" | "skipped";

type AllBackupProgress = Record<
  TeamBackupAppId,
  { status: AppBackupStepStatus; filename?: string; error?: string }
>;

type ProtectionPhase = "sharepoint" | "neon";

type ProtectionStepKey = `${ProtectionPhase}:${TeamBackupAppId}`;

type ProtectionProgress = Record<
  ProtectionStepKey,
  { status: AppBackupStepStatus; detail?: string; error?: string }
>;

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

function BackupAllProgress({
  apps,
  progress,
  currentAppId,
  busy,
}: {
  apps: BackupApp[];
  progress: AllBackupProgress;
  currentAppId: TeamBackupAppId | null;
  busy: boolean;
}) {
  const stats = useMemo(() => {
    const steps = Object.values(progress);
    const done = steps.filter((s) => s.status === "done").length;
    const failed = steps.filter((s) => s.status === "failed").length;
    return { done, failed, finished: done + failed, total: steps.length };
  }, [progress]);

  return (
    <div className="mt-4 space-y-2 border-t border-stone-200 pt-4">
      <div className="mb-1 flex items-center justify-between text-xs text-stone-600">
        <span>
          {busy && currentAppId
            ? `Backing up ${apps.find((a) => a.id === currentAppId)?.name ?? "app"}…`
            : stats.failed > 0
              ? `${stats.done} of ${stats.total} backed up, ${stats.failed} failed`
              : `${stats.done} of ${stats.total} backed up`}
        </span>
        <span>
          {stats.finished}/{stats.total}
        </span>
      </div>
      <div
        className="h-1.5 overflow-hidden rounded-full bg-stone-200"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={stats.total}
        aria-valuenow={stats.finished}
        aria-label="SharePoint backup progress"
      >
        <div
          className={`h-full rounded-full transition-all duration-300 ${
            stats.failed > 0 && !busy ? "bg-amber-500" : "bg-emerald-600"
          }`}
          style={{ width: `${Math.round((stats.finished / stats.total) * 100)}%` }}
        />
      </div>
      <ul className="space-y-0.5 text-xs">
        {apps.map((app) => {
          const step = progress[app.id];
          if (!step) return null;
          const tone =
            step.status === "failed"
              ? "text-amber-900"
              : step.status === "done"
                ? "text-emerald-800"
                : step.status === "running"
                  ? "font-medium text-emerald-700"
                  : "text-stone-500";
          return (
            <li key={app.id} className={tone}>
              {step.status === "pending" && "· "}
              {step.status === "running" && "… "}
              {step.status === "done" && "✓ "}
              {step.status === "failed" && "✕ "}
              {app.name}
              {step.status === "done" && step.filename ? ` — ${step.filename}` : ""}
              {step.status === "failed" && step.error ? ` — ${step.error}` : ""}
            </li>
          );
        })}
      </ul>
    </div>
  );
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
  const [allProgress, setAllProgress] = useState<AllBackupProgress | null>(null);
  const [allProgressCurrent, setAllProgressCurrent] = useState<TeamBackupAppId | null>(null);
  const [protectionBusy, setProtectionBusy] = useState(false);
  const [protectionProgress, setProtectionProgress] = useState<ProtectionProgress | null>(null);
  const [protectionCurrent, setProtectionCurrent] = useState<ProtectionStepKey | null>(null);
  const [protectionNeonEnabled, setProtectionNeonEnabled] = useState(true);

  const hubBusy = allBusy || protectionBusy || appBusy !== null;

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

  async function backupApps(appIds: TeamBackupAppId[]): Promise<{
    results: BackupResult[];
    configErrors: string[];
  }> {
    const res = await fetch("/api/team-backup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ apps: appIds }),
    });
    const data = (await res.json()) as {
      results?: BackupResult[];
      errors?: string[];
    };
    if (!res.ok) throw new Error("Backup request failed");
    return { results: data.results ?? [], configErrors: data.errors ?? [] };
  }

  function summarizeBackupResults(
    succeeded: BackupResult[],
    failed: BackupResult[],
    configErrors: string[]
  ) {
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
  }

  const protectionProgressStats = useMemo(() => {
    if (!protectionProgress) return null;
    const steps = Object.values(protectionProgress);
    const done = steps.filter((s) => s.status === "done").length;
    const failed = steps.filter((s) => s.status === "failed").length;
    const skipped = steps.filter((s) => s.status === "skipped").length;
    const finished = done + failed + skipped;
    return { done, failed, skipped, finished, total: steps.length };
  }, [protectionProgress]);

  function initProtectionProgress(
    apps: BackupApp[],
    neonEnabled: boolean
  ): ProtectionProgress {
    const progress = {} as ProtectionProgress;
    for (const app of apps) {
      progress[`sharepoint:${app.id}`] = { status: "pending" };
      progress[`neon:${app.id}`] = neonEnabled
        ? { status: "pending" }
        : { status: "skipped", detail: "NEON_API_KEY not set" };
    }
    return progress;
  }

  async function createNeonSnapshot(appId: TeamBackupAppId): Promise<{ ok: boolean; error?: string }> {
    const res = await fetch("/api/team-backup/neon-snapshot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ app: appId }),
    });
    const data = (await res.json()) as { error?: string };
    if (!res.ok) return { ok: false, error: data.error || "Neon snapshot failed" };
    return { ok: true };
  }

  async function runFullProtection() {
    const targets = state.apps;
    if (targets.length === 0) return;

    setMessage(null);
    setError(null);
    setAllProgress(null);
    setAllProgressCurrent(null);
    setProtectionBusy(true);

    let neonEnabled = true;
    try {
      const statusRes = await fetch("/api/team-backup/neon-status", { cache: "no-store" });
      const statusData = (await statusRes.json()) as { configured?: boolean };
      neonEnabled = Boolean(statusData.configured);
      setProtectionNeonEnabled(neonEnabled);
    } catch {
      neonEnabled = false;
      setProtectionNeonEnabled(false);
    }

    setProtectionProgress(initProtectionProgress(targets, neonEnabled));
    setProtectionCurrent(null);

    const spSucceeded: BackupResult[] = [];
    const spFailed: BackupResult[] = [];
    let configErrors: string[] = [];
    let neonSucceeded = 0;
    let neonFailed = 0;

    try {
      for (const app of targets) {
        const stepKey: ProtectionStepKey = `sharepoint:${app.id}`;
        setProtectionCurrent(stepKey);
        setProtectionProgress((prev) =>
          prev ? { ...prev, [stepKey]: { status: "running" } } : prev
        );

        try {
          const batch = await backupApps([app.id]);
          if (batch.configErrors.length > 0) {
            configErrors = batch.configErrors;
            const configMessage = batch.configErrors.join(" ");
            spFailed.push({
              appId: app.id,
              appName: app.name,
              ok: false,
              error: configMessage,
            });
            setProtectionProgress((prev) =>
              prev
                ? { ...prev, [stepKey]: { status: "failed", error: configMessage } }
                : prev
            );
            break;
          }

          const result = batch.results[0];
          if (result?.ok) {
            spSucceeded.push(result);
            setProtectionProgress((prev) =>
              prev
                ? {
                    ...prev,
                    [stepKey]: { status: "done", detail: result.filename },
                  }
                : prev
            );
          } else {
            const failure: BackupResult = result ?? {
              appId: app.id,
              appName: app.name,
              ok: false,
              error: "Backup failed",
            };
            spFailed.push(failure);
            setProtectionProgress((prev) =>
              prev
                ? {
                    ...prev,
                    [stepKey]: { status: "failed", error: failure.error },
                  }
                : prev
            );
          }
        } catch (e) {
          const msg = e instanceof Error ? e.message : "Backup failed";
          spFailed.push({ appId: app.id, appName: app.name, ok: false, error: msg });
          setProtectionProgress((prev) =>
            prev ? { ...prev, [stepKey]: { status: "failed", error: msg } } : prev
          );
        }
      }

      if (neonEnabled && configErrors.length === 0) {
        for (const app of targets) {
          const stepKey: ProtectionStepKey = `neon:${app.id}`;
          setProtectionCurrent(stepKey);
          setProtectionProgress((prev) =>
            prev ? { ...prev, [stepKey]: { status: "running" } } : prev
          );

          const result = await createNeonSnapshot(app.id);
          if (result.ok) {
            neonSucceeded += 1;
            setProtectionProgress((prev) =>
              prev ? { ...prev, [stepKey]: { status: "done", detail: "Snapshot created" } } : prev
            );
          } else {
            neonFailed += 1;
            setProtectionProgress((prev) =>
              prev
                ? { ...prev, [stepKey]: { status: "failed", error: result.error } }
                : prev
            );
          }
        }
        dispatchBackupHubRefreshNeon();
      }

      await load();

      const parts: string[] = [];
      if (spSucceeded.length > 0) {
        parts.push(`${spSucceeded.length} SharePoint backup(s) saved`);
      }
      if (neonEnabled && neonSucceeded > 0) {
        parts.push(`${neonSucceeded} Neon snapshot(s) created`);
      }
      if (!neonEnabled) {
        parts.push("Neon snapshots skipped (set NEON_API_KEY on Updates)");
      }
      if (parts.length > 0) setMessage(`Full protection run complete: ${parts.join("; ")}.`);

      if (configErrors.length > 0) {
        setError(configErrors.join(" "));
      } else if (spFailed.length > 0 || neonFailed > 0) {
        const msgs = [
          ...spFailed.map((r) => `SharePoint ${r.appName}: ${r.error}`),
        ];
        if (neonFailed > 0) msgs.push(`${neonFailed} Neon snapshot(s) failed`);
        setError(msgs.join(" "));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Full protection run failed");
    } finally {
      setProtectionBusy(false);
      setProtectionCurrent(null);
    }
  }

  async function runBackupAll() {
    const targets = state.apps;
    if (targets.length === 0) return;

    setMessage(null);
    setError(null);
    setAllBusy(true);
    setAllProgressCurrent(null);
    setAllProgress(
      Object.fromEntries(
        targets.map((app) => [app.id, { status: "pending" as const }])
      ) as AllBackupProgress
    );

    const succeeded: BackupResult[] = [];
    const failed: BackupResult[] = [];
    let configErrors: string[] = [];

    try {
      for (const app of targets) {
        setAllProgressCurrent(app.id);
        setAllProgress((prev) =>
          prev
            ? {
                ...prev,
                [app.id]: { status: "running" },
              }
            : prev
        );

        try {
          const batch = await backupApps([app.id]);
          if (batch.configErrors.length > 0) {
            configErrors = batch.configErrors;
            const configMessage = batch.configErrors.join(" ");
            failed.push({
              appId: app.id,
              appName: app.name,
              ok: false,
              error: configMessage,
            });
            setAllProgress((prev) =>
              prev
                ? {
                    ...prev,
                    [app.id]: { status: "failed", error: configMessage },
                  }
                : prev
            );
            break;
          }

          const result = batch.results[0];
          if (result?.ok) {
            succeeded.push(result);
            setAllProgress((prev) =>
              prev
                ? {
                    ...prev,
                    [app.id]: { status: "done", filename: result.filename },
                  }
                : prev
            );
          } else {
            const failure: BackupResult = result ?? {
              appId: app.id,
              appName: app.name,
              ok: false,
              error: "Backup failed",
            };
            failed.push(failure);
            setAllProgress((prev) =>
              prev
                ? {
                    ...prev,
                    [app.id]: { status: "failed", error: failure.error },
                  }
                : prev
            );
          }
        } catch (e) {
          const message = e instanceof Error ? e.message : "Backup failed";
          failed.push({ appId: app.id, appName: app.name, ok: false, error: message });
          setAllProgress((prev) =>
            prev
              ? {
                  ...prev,
                  [app.id]: { status: "failed", error: message },
                }
              : prev
          );
        }
      }

      summarizeBackupResults(succeeded, failed, configErrors);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Backup failed");
    } finally {
      setAllBusy(false);
      setAllProgressCurrent(null);
    }
  }

  async function runBackup(appIds?: TeamBackupAppId[]) {
    if (!appIds) {
      await runBackupAll();
      return;
    }

    setMessage(null);
    setError(null);
    setAllProgress(null);
    setAllProgressCurrent(null);
    if (appIds.length === 1) {
      setAppBusy(appIds[0]!);
    } else {
      setAllBusy(true);
    }

    try {
      const { results, configErrors } = await backupApps(appIds);
      const failed = results.filter((r) => !r.ok);
      const succeeded = results.filter((r) => r.ok);
      summarizeBackupResults(succeeded, failed, configErrors);
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

      <section className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-4 shadow-sm">
        <h2 className="mb-2 text-lg font-semibold text-stone-900">Full protection run</h2>
        <p className="mb-4 max-w-3xl text-sm text-stone-600">
          Back up all apps to SharePoint, then create a fresh Neon snapshot for each production
          database. Use before risky changes or on a regular schedule.
        </p>
        <button
          type="button"
          disabled={loading || hubBusy || restoreBusy !== null}
          onClick={() => runFullProtection()}
          className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800 disabled:opacity-60"
        >
          {protectionBusy ? "Running full protection…" : "Run full protection"}
        </button>

        {protectionProgress && protectionProgressStats && (
          <div className="mt-4 space-y-3">
            <div>
              <div className="mb-1 flex items-center justify-between text-sm text-stone-600">
                <span>
                  {protectionBusy && protectionCurrent
                    ? protectionCurrent.startsWith("sharepoint:")
                      ? `SharePoint: ${state.apps.find((a) => `sharepoint:${a.id}` === protectionCurrent)?.name ?? "app"}…`
                      : `Neon snapshot: ${state.apps.find((a) => `neon:${a.id}` === protectionCurrent)?.name ?? "app"}…`
                    : protectionProgressStats.failed > 0
                      ? `${protectionProgressStats.done} done, ${protectionProgressStats.failed} failed`
                      : `${protectionProgressStats.finished} of ${protectionProgressStats.total} steps complete`}
                </span>
                <span>
                  {protectionProgressStats.finished}/{protectionProgressStats.total}
                </span>
              </div>
              <div
                className="h-2 overflow-hidden rounded-full bg-stone-200"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={protectionProgressStats.total}
                aria-valuenow={protectionProgressStats.finished}
                aria-label="Full protection progress"
              >
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    protectionProgressStats.failed > 0 && !protectionBusy
                      ? "bg-amber-500"
                      : "bg-emerald-700"
                  }`}
                  style={{
                    width: `${Math.round(
                      (protectionProgressStats.finished / protectionProgressStats.total) * 100
                    )}%`,
                  }}
                />
              </div>
            </div>

            <ul className="space-y-1 text-sm">
              {state.apps.map((app) => {
                const sp = protectionProgress[`sharepoint:${app.id}`];
                const neon = protectionProgress[`neon:${app.id}`];
                return (
                  <li key={app.id} className="space-y-0.5">
                    {sp && (
                      <div
                        className={
                          sp.status === "failed"
                            ? "text-amber-900"
                            : sp.status === "done"
                              ? "text-emerald-800"
                              : sp.status === "running"
                                ? "font-medium text-emerald-700"
                                : "text-stone-500"
                        }
                      >
                        {sp.status === "pending" && "· "}
                        {sp.status === "running" && "… "}
                        {sp.status === "done" && "✓ "}
                        {sp.status === "failed" && "✕ "}
                        SharePoint {app.name}
                        {sp.status === "done" && sp.detail ? ` — ${sp.detail}` : ""}
                        {sp.status === "failed" && sp.error ? ` — ${sp.error}` : ""}
                      </div>
                    )}
                    {neon && protectionNeonEnabled && (
                      <div
                        className={
                          neon.status === "failed"
                            ? "text-amber-900"
                            : neon.status === "done"
                              ? "text-emerald-800"
                              : neon.status === "running"
                                ? "font-medium text-emerald-700"
                                : neon.status === "skipped"
                                  ? "text-stone-400"
                                  : "text-stone-500"
                        }
                      >
                        {neon.status === "pending" && "· "}
                        {neon.status === "running" && "… "}
                        {neon.status === "done" && "✓ "}
                        {neon.status === "failed" && "✕ "}
                        {neon.status === "skipped" && "– "}
                        Neon {app.name}
                        {neon.status === "done" && neon.detail ? ` — ${neon.detail}` : ""}
                        {neon.status === "failed" && neon.error ? ` — ${neon.error}` : ""}
                        {neon.status === "skipped" && neon.detail ? ` — ${neon.detail}` : ""}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </section>

      <section className="rounded-xl border border-stone-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-stone-200 px-4 py-4">
          <div>
            <h2 className="text-lg font-semibold text-stone-900">SharePoint backups</h2>
            <p className="mt-1 max-w-3xl text-sm text-stone-600">
              Portable backups in the TEAM SharePoint <strong>Backups</strong> folder (
              <code className="rounded bg-stone-100 px-1 text-xs">App name-YYYY-MM-DD_HH-mm-ss</code>
              ). HR and Voc hotline include file archives.
            </p>
          </div>
          <button
            type="button"
            disabled={loading || hubBusy || restoreBusy !== null}
            onClick={() => runBackup()}
            className="shrink-0 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            {allBusy ? "Backing up all…" : "Backup all"}
          </button>
        </div>

        {loading ? (
          <p className="px-4 py-6 text-sm text-stone-500">Loading SharePoint backups…</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-stone-50 text-xs text-stone-600">
                <tr>
                  <th className="px-4 py-2.5 font-medium">App</th>
                  <th className="px-4 py-2.5 font-medium">Restore from</th>
                  <th className="px-4 py-2.5 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {state.apps.map((app) => {
                  const files = backupsByApp.get(app.id) ?? [];
                  const latest = files[0];
                  return (
                    <tr key={app.id} className="border-t border-stone-200 align-middle">
                      <td className="px-4 py-2.5">
                        <div className="font-medium text-stone-900">{app.name}</div>
                        {latest && (
                          <div className="mt-0.5 truncate text-xs text-stone-500" title={latest.name}>
                            Latest: {formatWhen(latest.createdAt)} · {formatSize(latest.size)}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-2.5">
                        <select
                          value={selectedBackup[app.id]}
                          onChange={(e) =>
                            setSelectedBackup((prev) => ({ ...prev, [app.id]: e.target.value }))
                          }
                          disabled={files.length === 0 || restoreBusy !== null}
                          className="w-full min-w-[12rem] max-w-md rounded-md border border-stone-300 bg-white px-2 py-1.5 text-xs disabled:bg-stone-100"
                          aria-label={`Restore backup for ${app.name}`}
                        >
                          {files.length === 0 ? (
                            <option value="">No backups yet</option>
                          ) : (
                            files.map((file) => (
                              <option key={file.id} value={file.id}>
                                {formatWhen(file.createdAt)} · {formatSize(file.size)}
                              </option>
                            ))
                          )}
                        </select>
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            disabled={loading || hubBusy || restoreBusy !== null}
                            onClick={() => runBackup([app.id])}
                            className="rounded-md border border-stone-300 bg-white px-2.5 py-1.5 text-xs font-medium text-stone-800 hover:bg-stone-50 disabled:opacity-60"
                          >
                            {appBusy === app.id ? "…" : "Backup"}
                          </button>
                          <button
                            type="button"
                            disabled={
                              files.length === 0 ||
                              !selectedBackup[app.id] ||
                              restoreBusy !== null ||
                              hubBusy
                            }
                            onClick={() => runRestore(app.id)}
                            className="rounded-md bg-red-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-60"
                          >
                            {restoreBusy === app.id ? "…" : "Restore"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {allProgress && (
          <div className="px-4 pb-4">
            <BackupAllProgress
              apps={state.apps}
              progress={allProgress}
              currentAppId={allProgressCurrent}
              busy={allBusy}
            />
          </div>
        )}
      </section>
    </div>
  );
}
