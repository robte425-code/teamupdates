"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { useViewMode } from "@/contexts/ViewModeContext";
import type { PhoneBookEntryDTO } from "@/app/api/phone-book/route";

type TextColKey =
  | "workCell"
  | "fax"
  | "extension"
  | "personalEmail"
  | "personalPhone"
  | "remarks";

const TEXT_COLS: {
  key: TextColKey;
  label: string;
  nowrapDisplay?: boolean;
}[] = [
  { key: "workCell", label: "Work cell", nowrapDisplay: true },
  { key: "fax", label: "Fax", nowrapDisplay: true },
  { key: "extension", label: "Ext", nowrapDisplay: true },
  { key: "personalEmail", label: "Personal email" },
  { key: "personalPhone", label: "Personal phone", nowrapDisplay: true },
  { key: "remarks", label: "Remarks" },
];

const NEW_ROW_ID_PREFIX = "new-";

function sortByEmployeeName(a: PhoneBookEntryDTO, b: PhoneBookEntryDTO) {
  return a.employee.localeCompare(b.employee, undefined, { sensitivity: "base" });
}

function emptyRow(): PhoneBookEntryDTO {
  return {
    id: `${NEW_ROW_ID_PREFIX}${crypto.randomUUID()}`,
    sortOrder: 0,
    employee: "",
    isEmployee: true,
    workCell: "",
    fax: "",
    extension: "",
    personalEmail: "",
    personalPhone: "",
    remarks: "",
  };
}

type PutEntry = {
  id?: string;
  employee: string;
  isEmployee: boolean;
  workCell: string;
  fax: string;
  extension: string;
  personalEmail: string;
  personalPhone: string;
  remarks: string;
};

function rowsToPutEntries(list: PhoneBookEntryDTO[]): PutEntry[] {
  return list.map(
    ({ id, employee, isEmployee, workCell, fax, extension, personalEmail, personalPhone, remarks }) => {
      const payload: PutEntry = {
        employee,
        isEmployee,
        workCell,
        fax,
        extension,
        personalEmail,
        personalPhone,
        remarks,
      };
      if (!id.startsWith(NEW_ROW_ID_PREFIX)) {
        payload.id = id;
      }
      return payload;
    }
  );
}

async function persistPhoneBookRows(list: PhoneBookEntryDTO[]): Promise<PhoneBookEntryDTO[]> {
  const res = await fetch("/api/phone-book", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ entries: rowsToPutEntries(list) }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(t || "Save failed");
  }
  const data = (await res.json()) as PhoneBookEntryDTO[];
  return Array.isArray(data) ? data : [];
}

const READONLY_COL_COUNT = 1 + TEXT_COLS.length;

function PhoneBookReadonlyTable({ rows }: { rows: PhoneBookEntryDTO[] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-stone-200 bg-white shadow-sm">
      <table className="min-w-[56rem] w-full divide-y divide-stone-200 text-left text-sm">
        <thead className="bg-stone-50">
          <tr>
            <th className="whitespace-nowrap px-3 py-2 font-semibold text-stone-700">Name</th>
            {TEXT_COLS.map((c) => (
              <th key={c.key} className="whitespace-nowrap px-3 py-2 font-semibold text-stone-700">
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-100">
          {rows.length === 0 ? (
            <tr>
              <td
                colSpan={READONLY_COL_COUNT}
                className="px-3 py-4 text-center text-sm text-stone-500"
              >
                No entries in this section.
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={row.id} className="hover:bg-stone-50/60">
                <td className="align-top px-3 py-2 text-stone-800">
                  <span className="block whitespace-pre-wrap break-words">{row.employee || "—"}</span>
                </td>
                {TEXT_COLS.map((c) => (
                  <td key={c.key} className="align-top px-3 py-2 text-stone-800">
                    <span
                      className={
                        c.nowrapDisplay
                          ? "block whitespace-nowrap"
                          : "block whitespace-pre-wrap break-words"
                      }
                    >
                      {row[c.key] || "—"}
                    </span>
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

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

  const employeeRowsUser = useMemo(
    () => rows.filter((r) => r.isEmployee).sort(sortByEmployeeName),
    [rows]
  );
  const nonEmployeeRowsUser = useMemo(
    () => rows.filter((r) => !r.isEmployee).sort(sortByEmployeeName),
    [rows]
  );

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    fetch("/api/phone-book")
      .then(async (r) => {
        if (!r.ok) throw new Error(await r.text());
        return r.json();
      })
      .then((data: PhoneBookEntryDTO[]) => {
        const list = Array.isArray(data) ? data : [];
        setRows(
          list.map((r) => ({
            ...r,
            isEmployee: typeof r.isEmployee === "boolean" ? r.isEmployee : true,
          }))
        );
      })
      .catch(() => setError("Could not load phone book."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function updateField(index: number, key: "employee" | TextColKey, value: string) {
    setRows((prev) => {
      const next = [...prev];
      next[index] = { ...next[index]!, [key]: value };
      return next;
    });
    setSavedMsg(null);
  }

  function updateIsEmployee(index: number, isEmployee: boolean) {
    setRows((prev) => {
      const next = [...prev];
      next[index] = { ...next[index]!, isEmployee };
      return next;
    });
    setSavedMsg(null);
  }

  function addRow() {
    setRows((prev) => [...prev, emptyRow()]);
    setSavedMsg(null);
  }

  async function removeRow(index: number) {
    if (!editMode) return;
    const row = rows[index];
    if (!row) return;
    if (!confirm("Remove this row from the phone book?")) return;

    if (row.id.startsWith(NEW_ROW_ID_PREFIX)) {
      setRows((prev) => prev.filter((_, i) => i !== index));
      setSavedMsg(null);
      return;
    }

    setSaving(true);
    setError(null);
    setSavedMsg(null);
    try {
      const next = rows.filter((_, i) => i !== index);
      const data = await persistPhoneBookRows(next);
      setRows(data);
      setSavedMsg("Row removed.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not remove row");
    } finally {
      setSaving(false);
    }
  }

  async function handleSave() {
    if (!editMode) return;
    setSaving(true);
    setError(null);
    setSavedMsg(null);
    try {
      const data = await persistPhoneBookRows(rows);
      setRows(data);
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
      <div className="space-y-2 text-sm text-stone-600">
        <p>Contact information for team members and key numbers.</p>
        <p>Please do not share any personal email or phone number outside the company.</p>
        {editMode && (
          <p>
            Save changes applies your edits and any new rows. Remove deletes an existing row from the phone
            book immediately; unsaved new rows are discarded locally. Use the Employee column to mark who
            appears under Employees vs other contacts for everyone else.
          </p>
        )}
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {savedMsg && <p className="text-sm text-emerald-700">{savedMsg}</p>}

      {editMode ? (
        <div className="overflow-x-auto rounded-xl border border-stone-200 bg-white shadow-sm">
          <table className="min-w-[56rem] w-full divide-y divide-stone-200 text-left text-sm">
            <thead className="bg-stone-50">
              <tr>
                <th className="whitespace-nowrap px-3 py-2 font-semibold text-stone-700">Name</th>
                <th className="whitespace-nowrap px-3 py-2 font-semibold text-stone-700">Employee</th>
                {TEXT_COLS.map((c) => (
                  <th key={c.key} className="whitespace-nowrap px-3 py-2 font-semibold text-stone-700">
                    {c.label}
                  </th>
                ))}
                <th className="w-px whitespace-nowrap px-3 py-2 font-semibold text-stone-700">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {rows.map((row, rowIndex) => (
                <tr key={row.id} className="hover:bg-stone-50/60">
                  <td className="align-top px-3 py-2 text-stone-800">
                    <input
                      type="text"
                      value={row.employee}
                      onChange={(e) => updateField(rowIndex, "employee", e.target.value)}
                      className="w-full min-w-[7rem] rounded border border-stone-300 bg-white px-2 py-1 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </td>
                  <td className="align-top px-3 py-2">
                    <input
                      type="checkbox"
                      checked={row.isEmployee}
                      onChange={(e) => updateIsEmployee(rowIndex, e.target.checked)}
                      className="h-4 w-4 rounded border-stone-300 text-emerald-600 focus:ring-emerald-500"
                      aria-label="Employee"
                    />
                  </td>
                  {TEXT_COLS.map((c) => (
                    <td key={c.key} className="align-top px-3 py-2 text-stone-800">
                      <input
                        type="text"
                        value={row[c.key]}
                        onChange={(e) => updateField(rowIndex, c.key, e.target.value)}
                        className="w-full min-w-[7rem] rounded border border-stone-300 bg-white px-2 py-1 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </td>
                  ))}
                  <td className="align-top px-3 py-2">
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => void removeRow(rowIndex)}
                      className="whitespace-nowrap rounded border border-red-200 bg-white px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-60"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="space-y-8">
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-stone-800">Employees</h2>
            <PhoneBookReadonlyTable rows={employeeRowsUser} />
          </section>
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-stone-800">Other contacts</h2>
            <PhoneBookReadonlyTable rows={nonEmployeeRowsUser} />
          </section>
        </div>
      )}

      {editMode && (
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={saving}
            onClick={addRow}
            className="rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-800 hover:bg-stone-50 disabled:opacity-60"
          >
            Add row
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={handleSave}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      )}
    </div>
  );
}
