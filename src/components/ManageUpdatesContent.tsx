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
              <li key={item.id} className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
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
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-amber-700">
                        <span className="font-semibold">Published:</span>{" "}
                        {formatDateInPST(item.date)}
                      </p>
                      <h3 className="mt-1 font-medium text-stone-900">{item.title}</h3>
                      <p className="mt-2 text-sm text-stone-600 line-clamp-2">
                        <BodyWithLinks text={item.body} />
                      </p>
                    </div>
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
                        onClick={() => handleDelete(item.id)}
                        className="rounded px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
