"use client";

import { useEffect, useState } from "react";
import { KeyDateForm } from "./KeyDateForm";
import { BodyWithLinks } from "./BodyWithLinks";
import { formatKeyDateDisplay, formatTimeLeft } from "@/lib/formatKeyDate";

type KeyDate = {
  id: string;
  eventDate: string;
  title: string;
  body: string;
  deleteType?: "auto" | "manual";
  createdAt?: string;
};

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
              const { label, isPast, isDueWithin24h } = formatTimeLeft(item.eventDate);
              const isToday = isDueWithin24h && !isPast;
              return (
                <li key={item.id} className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
                  {editingId === item.id ? (
                    <KeyDateForm
                      initial={{
                        id: item.id,
                        eventDate: item.eventDate,
                        title: item.title,
                        body: item.body,
                        deleteType: item.deleteType ?? "manual",
                      }}
                      onSaved={() => {
                        setEditingId(null);
                        refetch();
                      }}
                      onCancel={() => setEditingId(null)}
                    />
                  ) : (
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="mb-1.5 flex flex-wrap items-center gap-2 text-xs text-stone-500">
                          <span>
                            <span className="font-medium">Published:</span>{" "}
                            {formatKeyDateDisplay(item.createdAt ?? item.eventDate)}
                          </span>
                          <span>
                            <span className="font-medium">Expires:</span>{" "}
                            {formatKeyDateDisplay(item.eventDate)}
                          </span>
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                              (item.deleteType ?? "manual") === "auto"
                                ? "bg-sky-100 text-sky-800"
                                : "bg-stone-200 text-stone-600"
                            }`}
                          >
                            {(item.deleteType ?? "manual") === "auto" ? "Auto delete" : "Manual"}
                          </span>
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                              isPast ? "bg-stone-200 text-stone-600" : isToday ? "bg-amber-200 text-amber-800" : "bg-emerald-100 text-emerald-800"
                            }`}
                          >
                            {label}
                          </span>
                        </div>
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
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
