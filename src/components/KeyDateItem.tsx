"use client";

import { useState } from "react";
import type { KeyDate } from "./KeyDatesSection";
import {
  formatDateInPST,
  formatKeyDateDisplay,
  formatTimeLeft,
} from "@/lib/formatKeyDate";
import { KeyDateForm } from "./KeyDateForm";
import { BodyWithLinks } from "./BodyWithLinks";
import { KeyDateCountdown } from "./KeyDateCountdown";

export function KeyDateItem({
  item,
  isAdmin,
  onSaved,
  onDeleted,
}: {
  item: KeyDate;
  isAdmin: boolean;
  onSaved: () => void;
  onDeleted: () => void;
}) {
  const { label, isPast, isDueWithin24h } = formatTimeLeft(item.eventDate);
  const showCountdown = isDueWithin24h || isPast;
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
          deleteType: item.deleteType ?? "manual",
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

  return (
    <li className="group rounded-xl border border-stone-200/80 bg-white p-4 shadow-sm transition-shadow hover:shadow-md">
      <div className="w-full">
        <div className="mb-1.5 space-y-0.5 text-xs font-medium uppercase tracking-wide text-amber-600/90">
          <p>
            <span className="font-semibold">Published:</span>{" "}
            {formatDateInPST(item.createdAt ?? item.eventDate)}
          </p>
        </div>
        <h3 className="mt-1.5 font-semibold text-stone-900">{item.title}</h3>
        <div className="mt-2 w-full text-sm leading-relaxed text-stone-600">
          <BodyWithLinks text={expanded ? item.body : bodyPreview} />
          {hasMore && (
            <button
              type="button"
              onClick={() => setExpanded(!expanded)}
              className="ml-1 font-medium text-amber-600 transition-colors hover:text-amber-700 hover:underline"
            >
              {expanded ? " Show less" : "… More"}
            </button>
          )}
        </div>
      </div>
      <div className="mt-3 flex w-full items-center justify-between border-t border-stone-100 pt-3">
        <div className="text-xs font-medium uppercase tracking-wide text-amber-600/90">
          <span className="font-semibold">Due date:</span>{" "}
          {formatKeyDateDisplay(item.eventDate)}
          {showCountdown ? (
            <span className="ml-2">
              <KeyDateCountdown eventDate={item.eventDate} />
            </span>
          ) : (
            <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800 sm:text-[11px]">
              {label}
            </span>
          )}
        </div>
        {isAdmin && (
          <div className="flex shrink-0 gap-1">
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-stone-500 hover:bg-stone-100 hover:text-stone-700"
            >
              Edit
            </button>
            <button
              type="button"
              onClick={handleDelete}
              className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 hover:text-red-700"
            >
              Delete
            </button>
          </div>
        )}
      </div>
    </li>
  );
}
