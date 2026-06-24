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
          Daily scheduled snapshots on each production root branch in Neon. Use{" "}
          <strong>Run full protection</strong> above to create SharePoint backups and fresh Neon
          snapshots together.
        </p>
      </div>
    </div>
  );
}
