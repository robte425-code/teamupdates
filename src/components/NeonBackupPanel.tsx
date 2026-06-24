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
      <span className="inline-flex rounded-full bg-stone-100 px-2 py-0.5 text-xs font-medium text-stone-700">
        API key not set
      </span>
    );
  }

  if (live?.error) {
    return (
      <span className="inline-flex rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-900 ring-1 ring-amber-200">
        Error
      </span>
    );
  }

  const hasSchedule = (live?.schedule.length ?? 0) > 0;
  if (!hasSchedule) {
    return (
      <span className="inline-flex rounded-full bg-stone-100 px-2 py-0.5 text-xs font-medium text-stone-700">
        No schedule
      </span>
    );
  }

  return (
    <span className="inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-800 ring-1 ring-emerald-200">
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
    <tr className="border-t border-stone-200 align-middle">
      <td className="w-36 px-3 py-2.5">
        <div className="whitespace-nowrap font-medium text-stone-900">{target.name}</div>
      </td>
      <td className="px-3 py-2.5">
        <ScheduleBadge live={live} configured={configured} />
        {live?.error && (
          <p className="mt-1 max-w-xs text-xs text-amber-800">{live.error}</p>
        )}
        {configured && !live?.error && (
          <div className="mt-1 space-y-0.5 text-xs text-stone-500">
            <div>
              {live?.branchName ?? target.rootBranch} branch
              {live?.historyRetentionLabel ? ` · PITR ${live.historyRetentionLabel}` : ""}
            </div>
            {live?.snapshotCount != null && live.snapshotCount > 0 && (
              <div>{live.snapshotCount} snapshot{live.snapshotCount === 1 ? "" : "s"} on branch</div>
            )}
          </div>
        )}
      </td>
      <td className="px-3 py-2.5 text-xs text-stone-600">
        {configured && !live?.error ? (
          <>
            <div>{formatWhen(live?.lastSnapshotAt ?? null)}</div>
            {live?.lastSnapshotName && (
              <div className="mt-0.5 truncate max-w-[14rem] text-stone-500" title={live.lastSnapshotName}>
                {live.lastSnapshotName}
              </div>
            )}
          </>
        ) : (
          <span className="text-stone-400">—</span>
        )}
      </td>
      <td className="px-3 py-2.5">
        <div className="flex flex-wrap items-center justify-end gap-2">
          <a
            href={neonLink.href}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-md border border-stone-300 bg-white px-2.5 py-1.5 text-xs font-medium text-stone-800 hover:bg-stone-50"
          >
            Neon
          </a>
          {configured && (
            <button
              type="button"
              disabled={snapshotBusy || Boolean(live?.error) || !target.neonProjectId}
              onClick={() => onSnapshot(target.id)}
              className="rounded-md bg-stone-800 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-stone-700 disabled:opacity-60"
            >
              {snapshotBusy ? "…" : "Snapshot"}
            </button>
          )}
          {target.neonProjectId && (
            <a
              href={vercelStorageUrl(target.vercelProject)}
              target="_blank"
              rel="noopener noreferrer"
              className="px-1 text-xs text-stone-500 underline hover:text-stone-900"
            >
              Vercel
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
              Scheduled snapshots and point-in-time restore (PITR) on each production database.
            </p>
            {fetchedLabel && configured && (
              <p className="mt-1 text-xs text-stone-500">Last refreshed: {fetchedLabel}</p>
            )}
          </div>
          <button
            type="button"
            onClick={() => load()}
            disabled={loading}
            className="shrink-0 rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-800 hover:bg-stone-50 disabled:opacity-60"
          >
            {loading ? "Refreshing…" : "Refresh"}
          </button>
        </div>

        {loading && !live ? (
          <p className="px-4 py-6 text-sm text-stone-500">Loading Neon status…</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full table-fixed text-left text-sm">
              <thead className="bg-stone-50 text-xs text-stone-600">
                <tr>
                  <th className="w-36 px-3 py-2.5 font-medium">App</th>
                  <th className="px-3 py-2.5 font-medium">Schedule</th>
                  <th className="w-40 px-3 py-2.5 font-medium">Last snapshot</th>
                  <th className="w-44 px-3 py-2.5 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {NEON_BACKUP_TARGETS.map((target) => (
                  <TargetRow
                    key={target.id}
                    target={target}
                    live={statusForApp(target.id, live)}
                    configured={configured}
                    snapshotBusy={snapshotBusy === target.id}
                    onSnapshot={createSnapshot}
                  />
                ))}
              </tbody>
            </table>
            {NEON_BACKUP_TARGETS.some((t) => t.notes) && (
              <p className="border-t border-stone-200 px-4 py-3 text-xs text-stone-500">
                {NEON_BACKUP_TARGETS.filter((t) => t.notes).map((target) => (
                  <span key={target.id}>
                    <span className="font-medium text-stone-700">{target.name}:</span> {target.notes}
                  </span>
                ))}
              </p>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
