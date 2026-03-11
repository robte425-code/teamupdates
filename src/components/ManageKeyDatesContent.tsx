"use client";

import { useEffect, useState } from "react";
import { KeyDateForm } from "./KeyDateForm";
import { BodyWithLinks } from "./BodyWithLinks";
import {
  formatDateInPST,
  formatKeyDateDisplay,
  formatKeyDateRange,
  formatTimeLeft,
} from "@/lib/formatKeyDate";
import { useNewBadgeDays } from "@/hooks/useNewBadgeDays";

type KeyDate = {
  id: string;
  dateType?: "due" | "event";
  eventDate: string;
  eventEndDate?: string | null;
  title: string;
  body: string;
  deleteType?: "auto" | "manual";
  createdAt?: string;
};

export function ManageKeyDatesContent() {
  const [items, setItems] = useState<KeyDate[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newBadgeDays, setNewBadgeDays] = useNewBadgeDays();

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
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-stone-800">Existing key dates</h2>
          <label className="flex items-center gap-2 text-xs text-stone-600">
            <span>Show NEW badge for</span>
            <input
              type="number"
              min={0}
              max={365}
              value={newBadgeDays}
              onChange={(e) => setNewBadgeDays(Number(e.target.value) || 0)}
              className="w-14 rounded-md border border-stone-300 bg-white px-1.5 py-1 text-xs text-stone-800 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
            <span>days after publish</span>
          </label>
        </div>
        {loading ? (
          <p className="text-sm text-stone-500">Loading…</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-stone-500">No key dates yet.</p>
        ) : (
          <ul className="space-y-4">
            {items.map((item) => {
              const refDate = item.dateType === "event" && item.eventEndDate ? item.eventEndDate : item.eventDate;
              const { label, isPast, isDueWithin24h } = formatTimeLeft(refDate);
              const isToday = isDueWithin24h && !isPast;
              const dateLabel = item.dateType === "event" ? "Event date:" : "Due date:";
              const dateValue = item.dateType === "event" && item.eventEndDate
                ? formatKeyDateRange(item.eventDate, item.eventEndDate)
                : formatKeyDateDisplay(item.eventDate);
              return (
                <li key={item.id} className="rounded-xl border border-stone-200 bg-white shadow-sm">
                  {editingId === item.id ? (
                    <KeyDateForm
                      initial={{
                        id: item.id,
                        dateType: item.dateType ?? "due",
                        eventDate: item.eventDate,
                        eventEndDate: item.eventEndDate ?? undefined,
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
                    <>
                      <div className="w-full p-4 pb-0">
                        {(() => {
                          const publishedAt = item.createdAt ? new Date(item.createdAt).getTime() : new Date(item.eventDate).getTime();
                          const windowMs = newBadgeDays * 24 * 60 * 60 * 1000;
                          const isNew = newBadgeDays > 0 && publishedAt >= Date.now() - windowMs;
                          return isNew ? (
                            <span className="mb-2 inline-block rounded-full bg-red-500 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white sm:text-xs">
                              NEW
                            </span>
                          ) : null;
                        })()}
                        <div className="flex items-baseline justify-between gap-3">
                          <h3 className="min-w-0 flex-1 font-medium text-stone-900">{item.title}</h3>
                          <span className="shrink-0 text-xs text-stone-400">
                            Published: {formatDateInPST(item.createdAt ?? item.eventDate)}
                          </span>
                        </div>
                        <p className="mt-1.5 flex flex-wrap items-center gap-2 text-[10px] sm:text-[11px]">
                          <span
                            className={`rounded-full px-2 py-0.5 font-semibold ${
                              (item.deleteType ?? "manual") === "auto"
                                ? "bg-sky-100 text-sky-800"
                                : "bg-stone-200 text-stone-600"
                            }`}
                          >
                            {(item.deleteType ?? "manual") === "auto" ? "Auto delete" : "Manual"}
                          </span>
                          <span
                            className={`rounded-full px-2 py-0.5 font-semibold ${
                              isPast
                                ? "bg-stone-200 text-stone-600"
                                : isToday
                                ? "bg-amber-200 text-amber-800"
                                : "bg-emerald-100 text-emerald-800"
                            }`}
                          >
                            {label}
                          </span>
                        </p>
                        <p className="mt-2 w-full text-sm text-stone-600">
                          <BodyWithLinks text={item.body} />
                        </p>
                      </div>
                      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-stone-200/60 bg-stone-50 px-4 py-3">
                        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs font-medium uppercase tracking-wide text-amber-600/90">
                          <span className="text-stone-900">
                            <span className="font-semibold">{dateLabel}</span>{" "}
                            {dateValue}
                          </span>
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
                      </div>
                    </>
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
