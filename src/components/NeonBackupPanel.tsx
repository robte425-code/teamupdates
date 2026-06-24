"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { BACKUP_HUB_REFRESH_NEON_EVENT } from "@/lib/backupHubEvents";
import {
  NEON_BACKUP_TARGETS,
  primaryNeonLink,
  vercelStorageUrl,
  type NeonBackupTarget,
} from "@/lib/neonBackupTargets";
import type { NeonAppBackupStatus, NeonBackupStatusResponse } from "@/lib/neonBackupStatus";
import type { TeamBackupAppId } from "@/lib/teamBackupApps";

function formatWhen(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function statusForApp(
  appId: TeamBackupAppId,
  live: NeonBackupStatusResponse | null
): NeonAppBackupStatus | null {
  return live?.apps.find((a) => a.appId === appId) ?? null;
}

function ScheduleBadge({
  live,
  configured,
}: {
  live: NeonAppBackupStatus | null;
  configured: boolean;
}) {
  if (!configured) {
    return (
      <span className="inline-flex rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-medium text-stone-700">
        API key not set
      </span>
    );
  }

  if (live?.error) {
    return (
      <span className="inline-flex rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-900 ring-1 ring-amber-200">
        Error
      </span>
    );
  }

  const hasSchedule = (live?.schedule.length ?? 0) > 0;
  if (!hasSchedule) {
    return (
      <span className="inline-flex rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-medium text-stone-700">
        No schedule
      </span>
    );
  }

  return (
    <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-800 ring-1 ring-emerald-200">
      {live?.scheduleSummary}
    </span>
  );
}

function TargetRow({
  target,
  live,
  configured,
  snapshotBusy,
  onSnapshot,
}: {
  target: NeonBackupTarget;
  live: NeonAppBackupStatus | null;
  configured: boolean;
  snapshotBusy: boolean;
  onSnapshot: (appId: TeamBackupAppId) => void;
}) {
  const neonLink = primaryNeonLink({
    ...target,
    neonBranchId: live?.branchId ?? target.neonBranchId,
  });

  return (
    <tr className="border-t border-stone-200 align-top">
      <td className="px-4 py-3">
        <div className="font-medium text-stone-900">{target.name}</div>
        {target.notes && <p className="mt-1 max-w-md text-xs text-stone-500">{target.notes}</p>}
        {live?.error && (
          <p className="mt-1 max-w-md text-xs text-amber-800">{live.error}</p>
        )}
      </td>
      <td className="px-4 py-3 text-sm text-stone-700">
        <code className="rounded bg-stone-100 px-1.5 py-0.5 text-xs">{target.vercelProject}</code>
      </td>
      <td className="px-4 py-3 text-sm text-stone-700">
        {target.neonProjectId ? (
          <code className="rounded bg-stone-100 px-1.5 py-0.5 text-xs">{target.neonProjectId}</code>
        ) : (
          <span className="text-stone-500">—</span>
        )}
        {(live?.branchId || target.neonBranchId) && (
          <div className="mt-1">
            <code className="rounded bg-stone-100 px-1.5 py-0.5 text-xs text-stone-600">
              {live?.branchId ?? target.neonBranchId}
            </code>
          </div>
        )}
        <div className="mt-1 text-xs text-stone-500">
          Branch: {live?.branchName ?? target.rootBranch}
        </div>
        {configured && live?.historyRetentionLabel && (
          <div className="mt-1 text-xs text-stone-500">
            PITR window: {live.historyRetentionLabel}
          </div>
        )}
      </td>
      <td className="px-4 py-3 text-sm text-stone-700">
        <ScheduleBadge live={live} configured={configured} />
        {configured && !live?.error && (
          <div className="mt-2 space-y-1 text-xs text-stone-600">
            <div>
              Last snapshot: {formatWhen(live?.lastSnapshotAt ?? null)}
              {live?.lastSnapshotName ? ` (${live.lastSnapshotName})` : ""}
            </div>
            <div>{live?.snapshotCount ?? 0} snapshot(s) on branch</div>
          </div>
        )}
      </td>
      <td className="px-4 py-3">
        <div className="flex flex-col gap-2">
          <a
            href={neonLink.href}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex w-fit rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm font-medium text-stone-800 hover:bg-stone-50"
          >
            {neonLink.label}
          </a>
          {configured && (
            <button
              type="button"
              disabled={snapshotBusy || Boolean(live?.error) || !target.neonProjectId}
              onClick={() => onSnapshot(target.id)}
              className="inline-flex w-fit rounded-lg bg-stone-800 px-3 py-1.5 text-sm font-medium text-white hover:bg-stone-700 disabled:opacity-60"
            >
              {snapshotBusy ? "Creating…" : "Create snapshot"}
            </button>
          )}
          {target.neonProjectId && (
            <a
              href={vercelStorageUrl(target.vercelProject)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex w-fit text-xs text-stone-600 underline hover:text-stone-900"
            >
              Vercel Storage
            </a>
          )}
        </div>
      </td>
    </tr>
  );
}

export function NeonBackupPanel() {
  const [live, setLive] = useState<NeonBackupStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [snapshotBusy, setSnapshotBusy] = useState<TeamBackupAppId | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const configured = live?.configured ?? false;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/team-backup/neon-status", { cache: "no-store" });
      const data = (await res.json()) as NeonBackupStatusResponse & { error?: string };
      if (!res.ok) throw new Error(data.error || "Could not load Neon status");
      setLive(data);
      if (data.globalError) setError(data.globalError);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load Neon status");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const onRefresh = () => {
      load();
    };
    window.addEventListener(BACKUP_HUB_REFRESH_NEON_EVENT, onRefresh);
    return () => window.removeEventListener(BACKUP_HUB_REFRESH_NEON_EVENT, onRefresh);
  }, [load]);

  async function createSnapshot(appId: TeamBackupAppId) {
    setSnapshotBusy(appId);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch("/api/team-backup/neon-snapshot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ app: appId }),
      });
      const data = (await res.json()) as { error?: string; snapshotId?: string };
      if (!res.ok) throw new Error(data.error || "Snapshot failed");
      setMessage(`${NEON_BACKUP_TARGETS.find((t) => t.id === appId)?.name ?? appId} snapshot created.`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Snapshot failed");
    } finally {
      setSnapshotBusy(null);
    }
  }

  const fetchedLabel = useMemo(() => {
    if (!live?.fetchedAt) return null;
    return formatWhen(live.fetchedAt);
  }, [live?.fetchedAt]);

  return (
    <div className="space-y-4">
      {(error || message) && (
        <div
          className={`rounded-lg border px-4 py-3 text-sm ${
            error
              ? "border-amber-200 bg-amber-50 text-amber-950"
              : "border-emerald-200 bg-emerald-50 text-emerald-900"
          }`}
        >
          {error || message}
        </div>
      )}

      <section className="rounded-xl border border-stone-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-stone-200 px-4 py-4">
          <div>
            <h2 className="text-lg font-semibold text-stone-900">Neon database protection</h2>
            <p className="mt-1 max-w-3xl text-sm text-stone-600">
              Live status from the Neon API: scheduled snapshots, last snapshot time, and instant
              restore (PITR) window per project.
            </p>
            {fetchedLabel && configured && (
              <p className="mt-1 text-xs text-stone-500">Last refreshed: {fetchedLabel}</p>
            )}
          </div>
          <button
            type="button"
            onClick={() => load()}
            disabled={loading}
            className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-800 hover:bg-stone-50 disabled:opacity-60"
          >
            {loading ? "Refreshing…" : "Refresh"}
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-stone-50 text-stone-600">
              <tr>
                <th className="px-4 py-3 font-medium">App</th>
                <th className="px-4 py-3 font-medium">Vercel project</th>
                <th className="px-4 py-3 font-medium">Neon project</th>
                <th className="px-4 py-3 font-medium">Snapshots</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && !live ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-sm text-stone-500">
                    Loading Neon status…
                  </td>
                </tr>
              ) : (
                NEON_BACKUP_TARGETS.map((target) => (
                  <TargetRow
                    key={target.id}
                    target={target}
                    live={statusForApp(target.id, live)}
                    configured={configured}
                    snapshotBusy={snapshotBusy === target.id}
                    onSnapshot={createSnapshot}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
