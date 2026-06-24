import {
  NEON_BACKUP_TARGETS,
  primaryNeonLink,
  vercelStorageUrl,
  type NeonBackupTarget,
} from "@/lib/neonBackupTargets";

function ScheduleBadge({ target }: { target: NeonBackupTarget }) {
  if (!target.snapshotScheduleEnabled) {
    return (
      <span className="inline-flex rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-medium text-stone-700">
        Not configured
      </span>
    );
  }

  const label =
    target.snapshotSchedule === "daily"
      ? "Daily snapshots enabled"
      : `${target.snapshotSchedule.charAt(0).toUpperCase()}${target.snapshotSchedule.slice(1)} snapshots enabled`;

  return (
    <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-800 ring-1 ring-emerald-200">
      {label}
    </span>
  );
}

function TargetRow({ target }: { target: NeonBackupTarget }) {
  const neonLink = primaryNeonLink(target);

  return (
    <tr className="border-t border-stone-200 align-top">
      <td className="px-4 py-3">
        <div className="font-medium text-stone-900">{target.name}</div>
        {target.notes && <p className="mt-1 max-w-md text-xs text-stone-500">{target.notes}</p>}
      </td>
      <td className="px-4 py-3 text-sm text-stone-700">
        <code className="rounded bg-stone-100 px-1.5 py-0.5 text-xs">{target.vercelProject}</code>
      </td>
      <td className="px-4 py-3 text-sm text-stone-700">
        {target.neonProjectId ? (
          <code className="rounded bg-stone-100 px-1.5 py-0.5 text-xs">{target.neonProjectId}</code>
        ) : (
          <span className="text-stone-500">Project ID pending</span>
        )}
        {target.neonBranchId && (
          <div className="mt-1">
            <code className="rounded bg-stone-100 px-1.5 py-0.5 text-xs text-stone-600">
              {target.neonBranchId}
            </code>
          </div>
        )}
        {target.neonEndpointHint && (
          <div className="mt-1 text-xs text-stone-500">{target.neonEndpointHint}…</div>
        )}
        <div className="mt-1 text-xs text-stone-500">Root branch: {target.rootBranch}</div>
      </td>
      <td className="px-4 py-3">
        <ScheduleBadge target={target} />
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

export function BackupHubLayersOverview() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-stone-900">SharePoint backups</h3>
        <p className="mt-2 text-sm text-stone-600">
          Portable <code className="rounded bg-stone-100 px-1">.sql</code> and{" "}
          <code className="rounded bg-stone-100 px-1">.zip</code> files in the TEAM SharePoint{" "}
          <strong>Backups</strong> folder. Use for cross-app restore, offline copies, and HR/Voc
          file archives.
        </p>
      </div>
      <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-stone-900">Neon snapshots</h3>
        <p className="mt-2 text-sm text-stone-600">
          Daily scheduled snapshots on each production root branch in Neon. Use for fast
          point-in-time recovery inside Neon when something goes wrong on a single database.
        </p>
      </div>
    </div>
  );
}

export function NeonBackupPanel() {
  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-stone-200 bg-white shadow-sm">
        <div className="border-b border-stone-200 px-4 py-4">
          <h2 className="text-lg font-semibold text-stone-900">Neon database protection</h2>
          <p className="mt-1 max-w-3xl text-sm text-stone-600">
            Each TEAM app has its own Neon project (provisioned through Vercel Storage). Manage
            snapshots and instant restore on the root branch via{" "}
            <strong>Backup &amp; restore</strong> in the Neon Console.
          </p>
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
              {NEON_BACKUP_TARGETS.map((target) => (
                <TargetRow key={target.id} target={target} />
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
