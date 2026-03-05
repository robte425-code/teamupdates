"use client";

import { useState } from "react";
import { format } from "date-fns";
import type { Update } from "./UpdatesSection";
import { UpdateForm } from "./UpdateForm";
import { BodyWithLinks } from "./BodyWithLinks";

export function UpdateItem({
  item,
  isAdmin,
  onSaved,
  onDeleted,
}: {
  item: Update;
  isAdmin: boolean;
  onSaved: () => void;
  onDeleted: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [expanded, setExpanded] = useState(false);

  async function handleDelete() {
    if (!confirm("Delete this update?")) return;
    const res = await fetch(`/api/updates/${item.id}`, { method: "DELETE" });
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

  const bodyPreview = item.body.slice(0, 120);
  const hasMore = item.body.length > 120;

  return (
    <li className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <time className="text-xs font-medium text-amber-700">
            {format(new Date(item.date), "MMM d, yyyy")}
          </time>
          <h3 className="mt-1 font-medium text-stone-900">{item.title}</h3>
          <div className="mt-2 text-sm text-stone-600">
            <BodyWithLinks text={expanded ? item.body : bodyPreview} />
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
