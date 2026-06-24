"use client";

import { useCallback, useEffect, useState } from "react";
import type { AccessRow } from "@/lib/team-access-hub";

function Toggle({
  checked,
  disabled,
  onChange,
  label,
}: {
  checked: boolean;
  disabled?: boolean;
  onChange: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onChange}
      aria-pressed={checked}
      aria-label={label}
      className={`rounded px-2 py-0.5 text-xs font-medium transition-colors ${
        checked ? "bg-stone-800 text-white" : "bg-stone-100 text-stone-500"
      } ${disabled ? "cursor-not-allowed opacity-60" : "hover:opacity-90"}`}
    >
      {checked ? "Yes" : "No"}
    </button>
  );
}

function emptyEditableRow(): AccessRow {
  return {
    email: "",
    displayName: "",
    envAdmin: false,
    requests: { agent: false },
    hr: { admin: false },
    payroll: { admin: false },
    voc: { admin: false },
  };
}

export function ManageAccessContent() {
  const [rows, setRows] = useState<AccessRow[]>([]);
  const [envAdmins, setEnvAdmins] = useState<string[]>([]);
  const [appErrors, setAppErrors] = useState<string[]>([]);
  const [saveErrors, setSaveErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newRow, setNewRow] = useState(emptyEditableRow);

  const load = useCallback(async () => {
    setLoading(true);
    setSaveErrors([]);
    try {
      const r = await fetch("/api/team-access", { cache: "no-store" });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Could not load");
      setRows(Array.isArray(data.rows) ? data.rows : []);
      setEnvAdmins(Array.isArray(data.envAdmins) ? data.envAdmins : []);
      setAppErrors(Array.isArray(data.appErrors) ? data.appErrors : []);
    } catch (e) {
      setAppErrors([e instanceof Error ? e.message : "Could not load"]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function patchRow(index: number, patch: Partial<AccessRow>) {
    setRows((list) => {
      const copy = [...list];
      copy[index] = { ...copy[index]!, ...patch };
      return copy;
    });
  }

  function toggleApp(
    index: number,
    app: "requests" | "hr" | "payroll" | "voc",
    field: string
  ) {
    const row = rows[index];
    if (!row || row.envAdmin) return;
    const next = { ...row };
    if (app === "requests") {
      next.requests = {
        ...next.requests,
        [field]: !(next.requests as Record<string, boolean>)[field],
      };
    } else if (app === "hr") {
      next.hr = { ...next.hr, [field]: !(next.hr as Record<string, boolean>)[field] };
    } else if (app === "payroll") {
      next.payroll = {
        ...next.payroll,
        [field]: !(next.payroll as Record<string, boolean>)[field],
      };
    } else {
      next.voc = { admin: !next.voc.admin };
    }
    patchRow(index, next);
  }

  async function save() {
    setSaving(true);
    setSaveErrors([]);
    try {
      const r = await fetch("/api/team-access", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Save failed");
      setRows(Array.isArray(data.rows) ? data.rows : rows);
      setAppErrors(Array.isArray(data.appErrors) ? data.appErrors : []);
      setSaveErrors(Array.isArray(data.saveErrors) ? data.saveErrors : []);
    } catch (e) {
      setSaveErrors([e instanceof Error ? e.message : "Save failed"]);
    } finally {
      setSaving(false);
    }
  }

  function addRow(e: React.FormEvent) {
    e.preventDefault();
    const email = newRow.email.trim().toLowerCase();
    if (!email.includes("@")) return;
    if (rows.some((r) => r.email.toLowerCase() === email)) return;
    setRows((list) => [...list, { ...newRow, email }]);
    setNewRow(emptyEditableRow());
  }

  function removeRow(index: number) {
    const row = rows[index];
    if (!row || row.envAdmin) return;
    setRows((list) => list.filter((_, i) => i !== index));
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-stone-900">Access hub</h1>
        <p className="mt-2 max-w-3xl text-sm text-stone-600">
          Grant admin/agent access across TEAM apps. Anyone on your allowed email domain can sign in
          as an employee and submit requests; use this page for agent and admin privileges only.
          Addresses in <code className="rounded bg-stone-100 px-1">ADMIN_EMAILS</code> (Vercel) are
          always full admins everywhere and cannot be edited here.
        </p>
      </div>

      {(appErrors.length > 0 || saveErrors.length > 0) && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          {[...appErrors, ...saveErrors].map((msg) => (
            <p key={msg}>{msg}</p>
          ))}
        </div>
      )}

      {envAdmins.length > 0 && (
        <p className="text-sm text-stone-600">
          <span className="font-medium">Default admins (env):</span> {envAdmins.join(", ")}
        </p>
      )}

      <form onSubmit={addRow} className="flex flex-wrap items-end gap-3 rounded-xl border border-stone-200 bg-white p-4">
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-stone-700">Email</span>
          <input
            type="email"
            required
            value={newRow.email}
            onChange={(e) => setNewRow({ ...newRow, email: e.target.value })}
            className="w-56 rounded-lg border border-stone-300 px-3 py-2 text-sm"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-stone-700">Display name</span>
          <input
            type="text"
            value={newRow.displayName}
            onChange={(e) => setNewRow({ ...newRow, displayName: e.target.value })}
            className="w-40 rounded-lg border border-stone-300 px-3 py-2 text-sm"
          />
        </label>
        <button
          type="submit"
          className="rounded-lg bg-stone-800 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700"
        >
          Add person
        </button>
      </form>

      {loading ? (
        <p className="text-sm text-stone-500">Loading access lists from all apps…</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-stone-200 bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-stone-200 bg-stone-50 text-xs uppercase tracking-wide text-stone-500">
              <tr>
                <th className="px-3 py-2">Email</th>
                <th className="px-3 py-2">Requests agent</th>
                <th className="px-3 py-2">HR admin</th>
                <th className="px-3 py-2">Payroll admin</th>
                <th className="px-3 py-2">Voc admin</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={row.email} className="border-b border-stone-100">
                  <td className="px-3 py-2">
                    <div className="font-medium text-stone-900">{row.email}</div>
                    {row.envAdmin && (
                      <span className="text-xs text-stone-500">env admin</span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <Toggle
                      label="Requests agent"
                      checked={row.requests.agent}
                      disabled={row.envAdmin}
                      onChange={() => toggleApp(i, "requests", "agent")}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <Toggle
                      label="HR admin"
                      checked={row.hr.admin}
                      disabled={row.envAdmin}
                      onChange={() => toggleApp(i, "hr", "admin")}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <Toggle
                      label="Payroll admin"
                      checked={row.payroll.admin}
                      disabled={row.envAdmin}
                      onChange={() => toggleApp(i, "payroll", "admin")}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <Toggle
                      label="Voc admin"
                      checked={row.voc.admin}
                      disabled={row.envAdmin}
                      onChange={() => toggleApp(i, "voc", "admin")}
                    />
                  </td>
                  <td className="px-3 py-2">
                    {!row.envAdmin && (
                      <button
                        type="button"
                        onClick={() => removeRow(i)}
                        className="text-xs font-medium text-red-600 hover:underline"
                      >
                        Remove
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex gap-3">
        <button
          type="button"
          disabled={saving || loading}
          onClick={save}
          className="rounded-lg bg-stone-800 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700 disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save to all apps"}
        </button>
        <button
          type="button"
          disabled={loading}
          onClick={load}
          className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50"
        >
          Reload
        </button>
      </div>
    </div>
  );
}
