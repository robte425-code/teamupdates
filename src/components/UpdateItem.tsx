"use client";

import { useState } from "react";
import type { Update } from "./UpdatesSection";
import { UpdateForm } from "./UpdateForm";
import { BodyWithLinks } from "./BodyWithLinks";
import { formatDateInPST } from "@/lib/formatKeyDate";

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
    <li className="group rounded-xl border border-stone-200/80 bg-white p-4 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-wide text-amber-600/90">
            <span className="font-semibold">Published:</span>{" "}
            {formatDateInPST(item.date)}
          </p>
          <h3 className="mt-1.5 font-semibold text-stone-900">{item.title}</h3>
          <div className="mt-2 text-sm leading-relaxed text-stone-600">
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
