"use client";

import { useRef, useState } from "react";

export function DatabaseBackupSection() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [confirmText, setConfirmText] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleRestore() {
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      setError("Choose a .sql backup file first.");
      setMessage(null);
      return;
    }
    if (confirmText.trim().toUpperCase() !== "RESTORE") {
      setError('Type RESTORE in the confirmation field.');
      setMessage(null);
      return;
    }
    if (!confirm("This will REPLACE all database data with the uploaded backup. Continue?")) {
      return;
    }

    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/database-backup", {
        method: "POST",
        body: form,
      });
      if (!res.ok) {
        const payload = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(payload.error || "Restore failed");
      }
      setMessage("Database restore complete.");
      setConfirmText("");
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (e) {
      setError(e instanceof Error ? e.message : "Restore failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mb-8 rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
      <h2 className="mb-2 text-lg font-semibold text-stone-900">Database backup</h2>
      <p className="mb-4 text-sm text-stone-600">
        Download a full SQL backup, or restore the entire database from a previously downloaded
        SQL backup file.
      </p>

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <a
          href="/api/database-backup"
          className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700"
        >
          Download database backup
        </a>
      </div>

      <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
        <h3 className="mb-2 text-sm font-semibold text-stone-800">Restore database backup</h3>
        <p className="mb-3 text-xs text-stone-600">
          Warning: this replaces all current data in all tables.
        </p>
        <div className="flex flex-col gap-3">
          <input
            ref={fileInputRef}
            type="file"
            accept=".sql,text/plain,application/sql"
            className="block text-sm text-stone-700 file:mr-3 file:rounded-md file:border-0 file:bg-stone-200 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-stone-800 hover:file:bg-stone-300"
          />
          <input
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder='Type "RESTORE" to confirm'
            className="max-w-sm rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-800 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
          <button
            type="button"
            disabled={busy}
            onClick={handleRestore}
            className="w-fit rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60"
          >
            {busy ? "Restoring..." : "Restore database backup"}
          </button>
        </div>
        {message && <p className="mt-3 text-sm text-emerald-700">{message}</p>}
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      </div>
    </section>
  );
}
