"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { BACKUP_HUB_REFRESH_NEON_EVENT, dispatchBackupHubRefreshNeon } from "@/lib/backupHubEvents";
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

  const allProgressStats = useMemo(() => {
    if (!allProgress) return null;
    const steps = Object.values(allProgress);
    const done = steps.filter((s) => s.status === "done").length;
    const failed = steps.filter((s) => s.status === "failed").length;
    const finished = done + failed;
    const total = steps.length;
    return { done, failed, finished, total };
  }, [allProgress]);

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
      <div>
        <p className="max-w-3xl text-sm text-stone-600">
          Backups are stored in the TEAM SharePoint site under the <strong>Backups</strong> folder.
          Each file is named <code className="rounded bg-stone-100 px-1">App name-YYYY-MM-DD_HH-mm-ss</code>.
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

      <section className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
        <h2 className="mb-2 text-lg font-semibold text-stone-900">Backup all apps</h2>
        <p className="mb-4 text-sm text-stone-600">
          Create fresh backups for Dashboard, Requests, Voc hotline, Payroll, and HR, then upload
          them to SharePoint.
        </p>
        <button
          type="button"
          disabled={loading || hubBusy || restoreBusy !== null}
          onClick={() => runBackup()}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
        >
          {allBusy ? "Backing up all apps..." : "Backup all apps"}
        </button>

        {allProgress && allProgressStats && (
          <div className="mt-4 space-y-3">
            <div>
              <div className="mb-1 flex items-center justify-between text-sm text-stone-600">
                <span>
                  {allBusy && allProgressCurrent
                    ? `Backing up ${state.apps.find((a) => a.id === allProgressCurrent)?.name ?? "app"} (${allProgressStats.finished + 1} of ${allProgressStats.total})…`
                    : allProgressStats.failed > 0
                      ? `${allProgressStats.done} of ${allProgressStats.total} backed up, ${allProgressStats.failed} failed`
                      : `${allProgressStats.done} of ${allProgressStats.total} backed up`}
                </span>
                <span>
                  {allProgressStats.finished}/{allProgressStats.total}
                </span>
              </div>
              <div
                className="h-2 overflow-hidden rounded-full bg-stone-200"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={allProgressStats.total}
                aria-valuenow={allProgressStats.finished}
                aria-label="Backup progress"
              >
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    allProgressStats.failed > 0 && !allBusy ? "bg-amber-500" : "bg-emerald-600"
                  }`}
                  style={{
                    width: `${Math.round((allProgressStats.finished / allProgressStats.total) * 100)}%`,
                  }}
                />
              </div>
            </div>

            <ul className="space-y-1 text-sm">
              {state.apps.map((app) => {
                const step = allProgress[app.id];
                if (!step) return null;

                let label = app.name;
                let tone = "text-stone-500";
                if (step.status === "running") {
                  label = `${app.name} — backing up…`;
                  tone = "font-medium text-emerald-700";
                } else if (step.status === "done") {
                  label = `${app.name} — saved${step.filename ? ` (${step.filename})` : ""}`;
                  tone = "text-emerald-800";
                } else if (step.status === "failed") {
                  label = `${app.name} — ${step.error ?? "failed"}`;
                  tone = "text-amber-900";
                }

                return (
                  <li key={app.id} className={tone}>
                    {step.status === "pending" && "· "}
                    {step.status === "running" && "… "}
                    {step.status === "done" && "✓ "}
                    {step.status === "failed" && "✕ "}
                    {label}
                  </li>
                );
              })}
            </ul>
          </div>
        )}
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
                      disabled={loading || hubBusy || restoreBusy !== null}
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
                        allBusy ||
                        protectionBusy
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
