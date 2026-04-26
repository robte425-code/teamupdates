"use client";

import { useState } from "react";
import type { Update } from "./UpdatesSection";
import { UpdateForm } from "./UpdateForm";
import { BodyWithLinks } from "./BodyWithLinks";
import { formatDateInPST } from "@/lib/formatKeyDate";
import { stripRichTextMarkup } from "@/lib/richText";

export function UpdateItem({
  item,
  isAdmin,
  onSaved,
  onDeleted,
  listArchived = false,
}: {
  item: Update;
  isAdmin: boolean;
  onSaved: () => void;
  onDeleted: () => void;
  /** When true, show Unarchive instead of Archive (archived list page). */
  listArchived?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [expanded, setExpanded] = useState(false);

  async function handleDelete() {
    if (!confirm("Delete this update?")) return;
    const res = await fetch(`/api/updates/${item.id}`, { method: "DELETE" });
    if (res.ok) onDeleted();
  }

  async function handleArchiveToggle() {
    const next = !listArchived;
    const label = next ? "Archive this update?" : "Unarchive this update?";
    if (!confirm(label)) return;
    const res = await fetch(`/api/updates/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ archived: next }),
    });
    if (res.ok) onDeleted();
  }

  if (editing) {
    return (
      <UpdateForm
        initial={{ id: item.id, title: item.title, body: item.body }}
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
  const displayBody = !hasMore || expanded ? item.body : bodyPreview;

  return (
    <li className="group relative overflow-hidden rounded-xl border border-stone-200/80 bg-white p-4 shadow-sm transition-shadow hover:shadow-md">
      <div className={`w-full ${isAdmin ? "mb-12" : ""}`}>
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="min-w-0 flex-1 font-semibold text-stone-900">
            <BodyWithLinks text={item.title} preLine={false} />
          </h3>
          <span className="shrink-0 text-xs text-stone-400">
            Published: {formatDateInPST(item.date)}
          </span>
        </div>
        <div className="mt-2 w-full text-sm leading-relaxed text-stone-600">
          <BodyWithLinks text={displayBody} preLine />
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
      {isAdmin && (
        <div className="absolute bottom-0 left-0 right-0 flex w-full justify-end border-t border-stone-200/60 bg-stone-50 px-4 py-3">
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
        </div>
      )}
    </li>
  );
}
