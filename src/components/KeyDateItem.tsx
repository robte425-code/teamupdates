"use client";

import { useState } from "react";
import type { KeyDate } from "./KeyDatesSection";
import {
  formatDateInPST,
  formatKeyDateDisplay,
  formatKeyDateRange,
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
  const isEvent = item.dateType === "event";
  const refDate = isEvent && item.eventEndDate ? item.eventEndDate : item.eventDate;
  const { label, isPast, isDueWithin24h } = formatTimeLeft(refDate);
  const showCountdown = isDueWithin24h || isPast;
  const displayLabel = isEvent ? "Event date:" : "Due date:";
  const displayValue = isEvent && item.eventEndDate
    ? formatKeyDateRange(item.eventDate, item.eventEndDate)
    : formatKeyDateDisplay(item.eventDate);
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
          dateType: item.dateType ?? "due",
          eventDate: item.eventDate,
          eventEndDate: item.eventEndDate ?? undefined,
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
    <li className="group rounded-xl border border-stone-200/80 bg-white shadow-sm transition-shadow hover:shadow-md">
      <div className="w-full p-4 pb-0">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="min-w-0 flex-1 font-semibold text-stone-900">{item.title}</h3>
          <span className="shrink-0 text-xs text-stone-400">
            Published: {formatDateInPST(item.createdAt ?? item.eventDate)}
          </span>
        </div>
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
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-stone-200/60 bg-stone-50 px-4 py-3">
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs font-medium uppercase tracking-wide text-amber-600/90">
          <span className="text-stone-900">
            <span className="font-semibold">{displayLabel}</span>{" "}
            {displayValue}
          </span>
          {showCountdown ? (
            <span className="shrink-0 whitespace-nowrap">
              <KeyDateCountdown eventDate={refDate} />
            </span>
          ) : (
            <span className="shrink-0 whitespace-nowrap rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800 sm:text-[11px]">
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
