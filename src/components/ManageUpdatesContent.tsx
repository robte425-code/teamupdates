"use client";

import { useEffect, useState } from "react";
import { UpdateForm } from "./UpdateForm";
import { BodyWithLinks } from "./BodyWithLinks";
import { formatDateInPST } from "@/lib/formatKeyDate";
import { CreatedByAdminNote } from "./CreatedByAdminNote";
import { UpdatedAdminBadge } from "./UpdatedAdminBadge";
import { useUpdateBadgeSettings } from "@/hooks/useUpdateBadgeSettings";

type Update = {
  id: string;
  date: string;
  title: string;
  body: string;
  createdByName?: string | null;
  createdByEmail?: string | null;
  contentUpdatedAt?: string | null;
  updatedByName?: string | null;
  updatedByEmail?: string | null;
};

export function ManageUpdatesContent() {
  const [items, setItems] = useState<Update[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const {
    updatedBadgeDays,
    setUpdatedBadgeDays,
    loaded: badgeSettingsLoaded,
  } = useUpdateBadgeSettings({ persistChanges: true });

  function refetch() {
    return fetch("/api/updates")
      .then((r) => r.json())
      .then((data) => setItems(Array.isArray(data) ? data : []));
  }

  useEffect(() => {
    refetch().finally(() => setLoading(false));
  }, []);

  async function handleDelete(id: string) {
    if (!confirm("Delete this update?")) return;
    const res = await fetch(`/api/updates/${id}`, { method: "DELETE" });
    if (res.ok) refetch();
  }

  async function handleArchive(id: string) {
    if (!confirm("Archive this update? It will move to Archived updates.")) return;
    const res = await fetch(`/api/updates/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ archived: true }),
    });
    if (res.ok) refetch();
  }

  return (
    <div className="space-y-8">
      <section>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
          <h2 className="text-lg font-semibold text-stone-800">Updates & reminders settings</h2>
          <label className="flex items-center gap-2 text-xs text-stone-600">
            <span>Show Updated badge for</span>
            <input
              type="number"
              min={0}
              max={365}
              value={updatedBadgeDays}
              disabled={!badgeSettingsLoaded}
              onChange={(e) => setUpdatedBadgeDays(Number(e.target.value) || 0)}
              className="w-14 rounded-md border border-stone-300 bg-white px-1.5 py-1 text-xs text-stone-800 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:opacity-50"
            />
            <span>days after edit</span>
          </label>
        </div>
        <h2 className="mb-3 text-lg font-semibold text-stone-800">Add new</h2>
        <UpdateForm onSaved={refetch} />
      </section>
      <section>
        <h2 className="mb-3 text-lg font-semibold text-stone-800">Existing updates & reminders</h2>
        {loading ? (
          <p className="text-sm text-stone-500">Loading…</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-stone-500">No updates yet.</p>
        ) : (
          <ul className="space-y-4">
            {items.map((item) => (
              <li key={item.id} className="relative overflow-hidden rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
                {editingId === item.id ? (
                  <UpdateForm
                    initial={{ id: item.id, title: item.title, body: item.body }}
                    onSaved={() => {
                      setEditingId(null);
                      refetch();
                    }}
                    onCancel={() => setEditingId(null)}
                  />
                ) : (
                  <>
                    <div className="mb-12 w-full">
                      <UpdatedAdminBadge
                        updatedAt={item.contentUpdatedAt}
                        name={item.updatedByName}
                        email={item.updatedByEmail}
                        updatedBadgeDays={updatedBadgeDays}
                      />
                      <div className="flex items-baseline justify-between gap-3">
                        <h3 className="min-w-0 flex-1 font-medium text-stone-900">
                          <BodyWithLinks text={item.title} preLine={false} />
                        </h3>
                        <span className="shrink-0 text-xs text-stone-400">
                          Published: {formatDateInPST(item.date)}
                        </span>
                      </div>
                      <CreatedByAdminNote name={item.createdByName} email={item.createdByEmail} />
                      <p className="mt-2 w-full text-sm text-stone-600">
                        <BodyWithLinks text={item.body} preLine />
                      </p>
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 flex w-full justify-end border-t border-stone-200/60 bg-stone-50 px-4 py-3">
                      <div className="flex shrink-0 gap-1">
                        <button
                          type="button"
                          onClick={() => setEditingId(item.id)}
                          className="rounded px-2 py-1 text-xs font-medium text-stone-500 hover:bg-stone-100"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleArchive(item.id)}
                          className="rounded px-2 py-1 text-xs font-medium text-stone-600 hover:bg-stone-100"
                        >
                          Archive
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(item.id)}
                          className="rounded px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
