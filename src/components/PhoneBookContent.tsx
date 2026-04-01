"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useViewMode } from "@/contexts/ViewModeContext";
import type { PhoneBookEntryDTO } from "@/app/api/phone-book/route";

const COLS: {
  key: keyof Omit<PhoneBookEntryDTO, "id" | "sortOrder">;
  label: string;
  /** In read-only view, keep on one line (phone-style fields). */
  nowrapDisplay?: boolean;
}[] = [
  { key: "employee", label: "Employee" },
  { key: "workCell", label: "Work cell", nowrapDisplay: true },
  { key: "fax", label: "Fax", nowrapDisplay: true },
  { key: "extension", label: "Ext", nowrapDisplay: true },
  { key: "personalEmail", label: "Personal email" },
  { key: "personalPhone", label: "Personal phone", nowrapDisplay: true },
  { key: "remarks", label: "Remarks" },
];

export function PhoneBookContent() {
  const { data: session } = useSession();
  const { showAdminView } = useViewMode();
  const user = session?.user as { role?: string } | undefined;
  const isAdmin = user?.role === "admin";
  const editMode = isAdmin && showAdminView;

  const [rows, setRows] = useState<PhoneBookEntryDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    fetch("/api/phone-book")
      .then(async (r) => {
        if (!r.ok) throw new Error(await r.text());
        return r.json();
      })
      .then((data: PhoneBookEntryDTO[]) => {
        setRows(Array.isArray(data) ? data : []);
      })
      .catch(() => setError("Could not load phone book."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function updateField(
    index: number,
    key: keyof Omit<PhoneBookEntryDTO, "id" | "sortOrder">,
    value: string
  ) {
    setRows((prev) => {
      const next = [...prev];
      next[index] = { ...next[index]!, [key]: value };
      return next;
    });
    setSavedMsg(null);
  }

  async function handleSave() {
    if (!editMode) return;
    setSaving(true);
    setError(null);
    setSavedMsg(null);
    try {
      const res = await fetch("/api/phone-book", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entries: rows.map(({ id, employee, workCell, fax, extension, personalEmail, personalPhone, remarks }) => ({
            id,
            employee,
            workCell,
            fax,
            extension,
            personalEmail,
            personalPhone,
            remarks,
          })),
        }),
      });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || "Save failed");
      }
      const data = (await res.json()) as PhoneBookEntryDTO[];
      setRows(Array.isArray(data) ? data : []);
      setSavedMsg("Saved.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-stone-500">Loading…</p>;
  }

  if (error && rows.length === 0) {
    return <p className="text-sm text-red-600">{error}</p>;
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-stone-600">
        {editMode
          ? "Edit any fields below, then click Save changes."
          : "Contact information for team members and key numbers."}
      </p>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {savedMsg && <p className="text-sm text-emerald-700">{savedMsg}</p>}

      <div className="overflow-x-auto rounded-xl border border-stone-200 bg-white shadow-sm">
        <table className="min-w-[56rem] w-full divide-y divide-stone-200 text-left text-sm">
          <thead className="bg-stone-50">
            <tr>
              {COLS.map((c) => (
                <th key={c.key} className="whitespace-nowrap px-3 py-2 font-semibold text-stone-700">
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {rows.map((row, rowIndex) => (
              <tr key={row.id} className="hover:bg-stone-50/60">
                {COLS.map((c) => (
                  <td key={c.key} className="align-top px-3 py-2 text-stone-800">
                    {editMode ? (
                      <input
                        type="text"
                        value={row[c.key]}
                        onChange={(e) => updateField(rowIndex, c.key, e.target.value)}
                        className="w-full min-w-[7rem] rounded border border-stone-300 bg-white px-2 py-1 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    ) : (
                      <span
                        className={
                          c.nowrapDisplay
                            ? "block whitespace-nowrap"
                            : "block whitespace-pre-wrap break-words"
                        }
                      >
                        {row[c.key] || "—"}
                      </span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editMode && (
        <button
          type="button"
          disabled={saving}
          onClick={handleSave}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save changes"}
        </button>
      )}
    </div>
  );
}
