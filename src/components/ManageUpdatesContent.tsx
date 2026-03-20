"use client";

import { useEffect, useState } from "react";
import { UpdateForm } from "./UpdateForm";
import { BodyWithLinks } from "./BodyWithLinks";
import { formatDateInPST } from "@/lib/formatKeyDate";

type Update = {
  id: string;
  date: string;
  title: string;
  body: string;
};

export function ManageUpdatesContent() {
  const [items, setItems] = useState<Update[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);

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
                      <div className="flex items-baseline justify-between gap-3">
                        <h3 className="min-w-0 flex-1 font-medium text-stone-900">{item.title}</h3>
                        <span className="shrink-0 text-xs text-stone-400">
                          Published: {formatDateInPST(item.date)}
                        </span>
                      </div>
                      <p className="mt-2 w-full text-sm text-stone-600">
                        <BodyWithLinks text={item.body} />
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
