"use client";

import { useEffect, useState } from "react";

type Visit = {
  id: string;
  userId?: string | null;
  userName?: string | null;
  userEmail?: string | null;
  path: string;
  visitedAt: string;
};

function formatDateTime(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function getVisitUserKey(v: Visit): string {
  if (v.userId) return v.userId;
  if (v.userEmail) return v.userEmail;
  return (v.userName ?? "").trim() || "—";
}

function getVisitUserLabel(v: Visit): string {
  if (v.userName?.trim()) return `${v.userName.trim()}${v.userEmail ? ` (${v.userEmail})` : ""}`;
  if (v.userEmail) return v.userEmail;
  return "—";
}

export function UsageStatsContent() {
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedUserKey, setSelectedUserKey] = useState<string>("");

  useEffect(() => {
    setLoading(true);
    fetch("/api/usage-stats")
      .then(async (r) => {
        if (!r.ok) throw new Error(await r.text());
        return r.json();
      })
      .then((data) => {
        setVisits(Array.isArray(data) ? data : []);
        setError(null);
      })
      .catch(() => setError("Failed to load usage stats."))
      .finally(() => setLoading(false));
  }, []);

  const uniqueUsers = (() => {
    const seen = new Set<string>();
    const list: { key: string; label: string }[] = [];
    for (const v of visits) {
      const key = getVisitUserKey(v);
      if (key && !seen.has(key)) {
        seen.add(key);
        list.push({ key, label: getVisitUserLabel(v) });
      }
    }
    list.sort((a, b) => a.label.localeCompare(b.label));
    return list;
  })();

  const filteredVisits = !selectedUserKey
    ? visits
    : visits.filter((v) => getVisitUserKey(v) === selectedUserKey);

  return (
    <div className="space-y-4">
      <p className="text-sm text-stone-600">
        History of user dashboard visits for the last 2 months.
      </p>
      {loading ? (
        <p className="text-sm text-stone-500">Loading…</p>
      ) : error ? (
        <p className="text-sm text-red-600">{error}</p>
      ) : visits.length === 0 ? (
        <p className="text-sm text-stone-500">No visits recorded yet.</p>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <label htmlFor="usage-filter-user" className="text-sm font-medium text-stone-700">
              Filter by user:
            </label>
            <select
              id="usage-filter-user"
              value={selectedUserKey}
              onChange={(e) => setSelectedUserKey(e.target.value)}
              className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm text-stone-800 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="">All users</option>
              {uniqueUsers.map((u) => (
                <option key={u.key} value={u.key}>
                  {u.label}
                </option>
              ))}
            </select>
            {selectedUserKey && (
              <span className="text-sm text-stone-500">
                ({filteredVisits.length} visit{filteredVisits.length !== 1 ? "s" : ""})
              </span>
            )}
          </div>
          <div className="overflow-x-auto rounded-xl border border-stone-200 bg-white shadow-sm">
            <table className="min-w-full divide-y divide-stone-200 text-left text-sm">
              <thead className="bg-stone-50">
                <tr>
                <th className="px-4 py-2 font-semibold text-stone-700">When</th>
                <th className="px-4 py-2 font-semibold text-stone-700">User</th>
                <th className="px-4 py-2 font-semibold text-stone-700">Email</th>
              </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filteredVisits.map((v) => (
                <tr key={v.id} className="hover:bg-stone-50/60">
                  <td className="whitespace-nowrap px-4 py-2 text-stone-800">
                    {formatDateTime(v.visitedAt)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2 text-stone-800">
                    {v.userName || "—"}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2 text-stone-600">
                    {v.userEmail || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        </>
      )}
    </div>
  );
}

