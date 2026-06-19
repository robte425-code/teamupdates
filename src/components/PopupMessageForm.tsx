"use client";

import { useState } from "react";
import { PopupRichTextEditor } from "./PopupRichTextEditor";

type Initial = {
  id?: string;
  title: string;
  body: string;
};

export function PopupMessageForm({
  initial,
  onSaved,
  onCancel,
}: {
  initial?: Initial;
  onSaved: () => void;
  onCancel?: () => void;
}) {
  const isEdit = !!initial?.id;
  const [title, setTitle] = useState(initial?.title ?? "");
  const [body, setBody] = useState(initial?.body ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const trimmedTitle = title.trim();
    const trimmedBody = body.trim();
    if (!trimmedTitle || !trimmedBody) {
      setError("Title and message are required.");
      return;
    }
    setLoading(true);
    try {
      const url = isEdit && initial?.id ? `/api/popup-messages/${initial.id}` : "/api/popup-messages";
      const method = isEdit ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: trimmedTitle, body: trimmedBody }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to save");
      if (!isEdit) {
        setTitle("");
        setBody("");
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-amber-200 bg-amber-50/50 p-4"
    >
      <h3 className="mb-3 text-sm font-medium text-stone-700">
        {isEdit ? "Edit popup message" : "Add popup message"}
      </h3>
      <div className="space-y-3">
        <div>
          <label className="mb-0.5 block text-xs font-medium text-stone-500">Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            placeholder="Popup title"
            className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-0.5 block text-xs font-medium text-stone-500">Message</label>
          <PopupRichTextEditor value={body} onChange={setBody} />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-amber-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-60"
          >
            {loading ? "Saving…" : isEdit ? "Save" : "Add"}
          </button>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm font-medium text-stone-700 hover:bg-stone-50"
            >
              Cancel
            </button>
          )}
        </div>
      </div>
    </form>
  );
}
