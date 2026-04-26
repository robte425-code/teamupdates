"use client";

import { useState } from "react";
import type { KeyDate } from "./KeyDatesSection";
import {
  formatDateInPST,
  formatKeyDateDisplay,
  formatKeyDateRange,
  formatTimeLeft,
} from "@/lib/formatKeyDate";
import { useNewBadgeDays } from "@/hooks/useNewBadgeDays";
import { KeyDateForm } from "./KeyDateForm";
import { BodyWithLinks } from "./BodyWithLinks";
import { stripRichTextMarkup } from "@/lib/richText";
import { KeyDateCountdown } from "./KeyDateCountdown";

export function KeyDateItem({
  item,
  isAdmin,
  onSaved,
  onDeleted,
  listArchived = false,
}: {
  item: KeyDate;
  isAdmin: boolean;
  onSaved: () => void;
  onDeleted: () => void;
  /** When true, show Unarchive instead of Archive (archived list). */
  listArchived?: boolean;
}) {
  const isEvent = item.dateType === "event";
  // Countdown and \"time left\" should always be to the start of the event (eventDate)
  const { label, isPast, isDueWithin24h } = formatTimeLeft(item.eventDate);
  const showCountdown = isDueWithin24h || isPast;
  const displayLabel = isEvent ? "Event date:" : "Due date:";
  const displayValue = isEvent && item.eventEndDate
    ? formatKeyDateRange(item.eventDate, item.eventEndDate)
    : formatKeyDateDisplay(item.eventDate);
  const [editing, setEditing] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [newBadgeDays] = useNewBadgeDays();

  async function handleDelete() {
    if (!confirm("Delete this key date?")) return;
    const res = await fetch(`/api/key-dates/${item.id}`, { method: "DELETE" });
    if (res.ok) onDeleted();
  }

  async function handleArchiveToggle() {
    const next = !listArchived;
    const label = next ? "Archive this key date?" : "Unarchive this key date?";
    if (!confirm(label)) return;
    const res = await fetch(`/api/key-dates/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ archived: next }),
    });
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
        }}
        onSaved={() => {
          setEditing(false);
          onSaved();
        }}
        onCancel={() => setEditing(false)}
      />
    );
  }

  const plainBody = stripRichTextMarkup(item.body);
  const bodyPreview = plainBody.slice(0, 120);
  const hasMore = plainBody.length > 120;

  const publishedAt = item.createdAt ? new Date(item.createdAt).getTime() : new Date(item.eventDate).getTime();
  const windowMs = newBadgeDays * 24 * 60 * 60 * 1000;
  const isNew = newBadgeDays > 0 && publishedAt >= Date.now() - windowMs;

  return (
    <li className="group rounded-xl border border-stone-200/80 bg-white shadow-sm transition-shadow hover:shadow-md">
      <div className="w-full p-4 pb-0">
        {isNew && (
          <span className="mb-2 inline-block rounded-full bg-red-500 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white sm:text-xs">
            NEW
          </span>
        )}
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="min-w-0 flex-1 font-semibold text-stone-900">
            <BodyWithLinks text={item.title} preLine={false} />
          </h3>
          <span className="shrink-0 text-xs text-stone-400">
            Published: {formatDateInPST(item.createdAt ?? item.eventDate)}
          </span>
        </div>
        <div className="mt-2 w-full text-sm leading-relaxed text-stone-600">
          <BodyWithLinks text={expanded ? item.body : bodyPreview} preLine />
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
              <KeyDateCountdown eventDate={item.eventDate} />
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
              onClick={handleArchiveToggle}
              className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-stone-600 hover:bg-stone-100 hover:text-stone-800"
            >
              {listArchived ? "Unarchive" : "Archive"}
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
