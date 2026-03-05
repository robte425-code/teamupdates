"use client";

import { useState } from "react";
import { format } from "date-fns";

type Initial = {
  id?: string;
  date: string;
  title: string;
  body: string;
};

export function UpdateForm({
  initial,
  onSaved,
  onCancel,
}: {
  initial?: Initial;
  onSaved: () => void;
  onCancel?: () => void;
}) {
  const isEdit = !!initial?.id;
  const [date, setDate] = useState(
    initial?.date
      ? format(new Date(initial.date), "yyyy-MM-dd")
      : format(new Date(), "yyyy-MM-dd")
  );
  const [title, setTitle] = useState(initial?.title ?? "");
  const [body, setBody] = useState(initial?.body ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (isEdit && initial?.id) {
        const res = await fetch(`/api/updates/${initial.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ date, title, text: body }),
        });
        if (!res.ok) throw new Error(await res.text());
      } else {
        const res = await fetch("/api/updates", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ date, title, text: body }),
        });
        if (!res.ok) throw new Error(await res.text());
      }
      setTitle("");
      setBody("");
      setDate(format(new Date(), "yyyy-MM-dd"));
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
        {isEdit ? "Edit update" : "Add update"}
      </h3>
      <div className="space-y-3">
        <div>
          <label className="mb-0.5 block text-xs font-medium text-stone-500">
            Date
          </label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
            className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-0.5 block text-xs font-medium text-stone-500">
            Title
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            placeholder="Title"
            className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-0.5 block text-xs font-medium text-stone-500">
            Body
          </label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            required
            rows={3}
            placeholder="Main body text…"
            className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm"
          />
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
