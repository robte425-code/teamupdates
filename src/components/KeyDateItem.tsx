"use client";

import { useState } from "react";
import { format } from "date-fns";
import type { KeyDate } from "./KeyDatesSection";
import { KeyDateForm } from "./KeyDateForm";

export function KeyDateItem({
  item,
  daysLeft: days,
  isAdmin,
  onSaved,
  onDeleted,
}: {
  item: KeyDate;
  daysLeft: number;
  isAdmin: boolean;
  onSaved: () => void;
  onDeleted: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [expanded, setExpanded] = useState(false);

  async function handleDelete() {
    if (!confirm("Delete this key date?")) return;
    const res = await fetch(`/api/key-dates/${item.id}`, { method: "DELETE" });
    if (res.ok) onDeleted();
  }

  if (editing) {
    return (
      <KeyDateForm
        initial={{
          id: item.id,
          eventDate: item.eventDate,
          title: item.title,
          body: item.body,
        }}
        onSaved={() => {
          setEditing(false);
          onSaved();
        }}
        onCancel={() => setEditing(false)}
      />
    );
  }

  const bodyPreview = item.body.slice(0, 120);
  const hasMore = item.body.length > 120;
  const isPast = days < 0;
  const isToday = days === 0;

  return (
    <li className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <time className="text-xs font-medium text-stone-500">
              {format(new Date(item.eventDate), "MMM d, yyyy")}
            </time>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                isPast
                  ? "bg-stone-200 text-stone-600"
                  : isToday
                  ? "bg-amber-200 text-amber-800"
                  : "bg-emerald-100 text-emerald-800"
              }`}
            >
              {isPast
                ? `${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"} ago`
                : isToday
                ? "Due today"
                : `${days} day${days === 1 ? "" : "s"} left`}
            </span>
          </div>
          <h3 className="mt-1 font-medium text-stone-900">{item.title}</h3>
          <div className="mt-2 text-sm text-stone-600">
            {expanded ? item.body : bodyPreview}
            {hasMore && (
              <button
                type="button"
                onClick={() => setExpanded(!expanded)}
                className="ml-1 text-amber-600 hover:underline"
              >
                {expanded ? " Show less" : "… More"}
              </button>
            )}
          </div>
        </div>
        {isAdmin && (
          <div className="flex shrink-0 gap-1">
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="rounded px-2 py-1 text-xs font-medium text-stone-500 hover:bg-stone-100 hover:text-stone-700"
            >
              Edit
            </button>
            <button
              type="button"
              onClick={handleDelete}
              className="rounded px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
            >
              Delete
            </button>
          </div>
        )}
      </div>
    </li>
  );
}
