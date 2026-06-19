"use client";

import { useEffect, useState } from "react";
import { PopupMessageForm } from "./PopupMessageForm";
import { PopupMessageBody } from "./PopupMessageBody";
import { CreatedByAdminNote } from "./CreatedByAdminNote";
import { formatDateInPST } from "@/lib/formatKeyDate";
import { popupHtmlToPlainPreview } from "@/lib/sanitizePopupHtml";

type PopupMessage = {
  id: string;
  title: string;
  body: string;
  updatedAt: string;
  createdByName?: string | null;
  createdByEmail?: string | null;
};

export function ManagePopupContent() {
  const [items, setItems] = useState<PopupMessage[]>([]);
  const [activePopupId, setActivePopupId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [savingActive, setSavingActive] = useState(false);

  function refetch() {
    return fetch("/api/popup-messages", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data.messages)) setItems(data.messages);
        setActivePopupId(data.activePopupId ?? null);
      });
  }

  useEffect(() => {
    refetch().finally(() => setLoading(false));
  }, []);

  async function handleDelete(id: string) {
    if (!confirm("Delete this popup message?")) return;
    const res = await fetch(`/api/popup-messages/${id}`, { method: "DELETE" });
    if (res.ok) refetch();
  }

  async function setActive(id: string | null) {
    setSavingActive(true);
    try {
      const res = await fetch("/api/popup-messages/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activePopupId: id }),
      });
      if (res.ok) {
        const data = await res.json();
        setActivePopupId(data.activePopupId ?? null);
      }
    } finally {
      setSavingActive(false);
    }
  }

  return (
    <div className="space-y-8">
      <p className="max-w-2xl text-sm text-stone-600">
        Choose which message appears in a popup when users open the TEAM dashboard. Users dismiss
        it with Ok and will see it again on their next visit.
      </p>

      <section className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-lg font-semibold text-stone-800">Displayed on dashboard</h2>
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-stone-700">
            <input
              type="radio"
              name="active-popup"
              checked={activePopupId === null}
              disabled={savingActive}
              onChange={() => setActive(null)}
            />
            None (no popup)
          </label>
          {items.map((item) => (
            <label
              key={item.id}
              className="flex cursor-pointer items-center gap-2 text-sm text-stone-700"
            >
              <input
                type="radio"
                name="active-popup"
                checked={activePopupId === item.id}
                disabled={savingActive}
                onChange={() => setActive(item.id)}
              />
              {item.title}
            </label>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-stone-800">Add new</h2>
        <PopupMessageForm onSaved={refetch} />
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-stone-800">Popup messages</h2>
        {loading ? (
          <p className="text-sm text-stone-500">Loading…</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-stone-500">No popup messages yet.</p>
        ) : (
          <ul className="space-y-4">
            {items.map((item) => (
              <li
                key={item.id}
                className="relative overflow-hidden rounded-xl border border-stone-200 bg-white p-4 shadow-sm"
              >
                {editingId === item.id ? (
                  <PopupMessageForm
                    initial={{ id: item.id, title: item.title, body: item.body }}
                    onSaved={() => {
                      setEditingId(null);
                      refetch();
                    }}
                    onCancel={() => setEditingId(null)}
                  />
                ) : (
                  <>
                    <div className="mb-12 w-full">
                      <div className="flex flex-wrap items-baseline justify-between gap-3">
                        <h3 className="min-w-0 flex-1 font-medium text-stone-900">{item.title}</h3>
                        <span className="shrink-0 text-xs text-stone-400">
                          Updated: {formatDateInPST(item.updatedAt)}
                        </span>
                      </div>
                      {activePopupId === item.id && (
                        <span className="mt-1 inline-block rounded bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">
                          Active on dashboard
                        </span>
                      )}
                      <CreatedByAdminNote name={item.createdByName} email={item.createdByEmail} />
                      <div className="mt-3 max-h-40 overflow-y-auto rounded-lg border border-stone-100 bg-stone-50 p-3 text-sm">
                        <PopupMessageBody html={item.body} />
                      </div>
                      <p className="mt-2 text-xs text-stone-500">
                        Preview text: {popupHtmlToPlainPreview(item.body)}
                      </p>
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 flex w-full justify-end border-t border-stone-200/60 bg-stone-50 px-4 py-3">
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
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
