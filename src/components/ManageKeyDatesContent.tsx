"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { KeyDateForm } from "./KeyDateForm";

type KeyDate = {
  id: string;
  eventDate: string;
  title: string;
  body: string;
};

function daysLeft(dateStr: string): number {
  const d = new Date(dateStr);
  d.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((d.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
}

export function ManageKeyDatesContent() {
  const [items, setItems] = useState<KeyDate[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);

  function refetch() {
    return fetch("/api/key-dates")
      .then((r) => r.json())
      .then((data) => setItems(Array.isArray(data) ? data : []));
  }

  useEffect(() => {
    refetch().finally(() => setLoading(false));
  }, []);

  async function handleDelete(id: string) {
    if (!confirm("Delete this key date?")) return;
    const res = await fetch(`/api/key-dates/${id}`, { method: "DELETE" });
    if (res.ok) refetch();
  }

  return (
    <div className="space-y-8">
      <section>
        <h2 className="mb-3 text-lg font-semibold text-stone-800">Add new</h2>
        <KeyDateForm onSaved={refetch} />
      </section>
      <section>
        <h2 className="mb-3 text-lg font-semibold text-stone-800">Existing key dates</h2>
        {loading ? (
          <p className="text-sm text-stone-500">Loading…</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-stone-500">No key dates yet.</p>
        ) : (
          <ul className="space-y-4">
            {items.map((item) => {
              const days = daysLeft(item.eventDate);
              const isPast = days < 0;
              const isToday = days === 0;
              return (
                <li key={item.id} className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
                  {editingId === item.id ? (
                    <KeyDateForm
                      initial={{ id: item.id, eventDate: item.eventDate, title: item.title, body: item.body }}
                      onSaved={() => {
                        setEditingId(null);
                        refetch();
                      }}
                      onCancel={() => setEditingId(null)}
                    />
                  ) : (
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <time className="text-xs font-medium text-stone-500">
                            {format(new Date(item.eventDate), "MMM d, yyyy")}
                          </time>
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                              isPast ? "bg-stone-200 text-stone-600" : isToday ? "bg-amber-200 text-amber-800" : "bg-emerald-100 text-emerald-800"
                            }`}
                          >
                            {isPast ? `${Math.abs(days)} days ago` : isToday ? "Due today" : `${days} days left`}
                          </span>
                        </div>
                        <h3 className="mt-1 font-medium text-stone-900">{item.title}</h3>
                        <p className="mt-2 text-sm text-stone-600 line-clamp-2">{item.body}</p>
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
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
