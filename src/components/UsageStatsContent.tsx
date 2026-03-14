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

export function UsageStatsContent() {
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <div className="space-y-4">
      <p className="text-sm text-stone-600">
        History of home page visits for the last 2 months.
      </p>
      {loading ? (
        <p className="text-sm text-stone-500">Loading…</p>
      ) : error ? (
        <p className="text-sm text-red-600">{error}</p>
      ) : visits.length === 0 ? (
        <p className="text-sm text-stone-500">No visits recorded yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-stone-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-stone-200 text-left text-sm">
            <thead className="bg-stone-50">
              <tr>
                <th className="px-4 py-2 font-semibold text-stone-700">When</th>
                <th className="px-4 py-2 font-semibold text-stone-700">User</th>
                <th className="px-4 py-2 font-semibold text-stone-700">Email</th>
                <th className="px-4 py-2 font-semibold text-stone-700">Path</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {visits.map((v) => (
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
                  <td className="whitespace-nowrap px-4 py-2 text-stone-600">
                    {v.path}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

