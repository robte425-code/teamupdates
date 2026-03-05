"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";

type Initial = {
  id?: string;
  eventDate: string;
  title: string;
  body: string;
};

export function KeyDateForm({
  initial,
  onSaved,
  onCancel,
}: {
  initial?: Initial;
  onSaved: () => void;
  onCancel?: () => void;
}) {
  const isEdit = !!initial?.id;
  const [eventDate, setEventDate] = useState(
    initial?.eventDate ? format(new Date(initial.eventDate), "yyyy-MM-dd") : ""
  );
  useEffect(() => {
    if (!initial?.eventDate) setEventDate(format(new Date(), "yyyy-MM-dd"));
  }, [initial?.eventDate]);
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
        const res = await fetch(`/api/key-dates/${initial.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ eventDate, title, text: body }),
        });
        if (!res.ok) throw new Error(await res.text());
      } else {
        const res = await fetch("/api/key-dates", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ eventDate, title, text: body }),
        });
        if (!res.ok) throw new Error(await res.text());
      }
      setTitle("");
      setBody("");
      setEventDate(format(new Date(), "yyyy-MM-dd"));
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
      className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4"
    >
      <h3 className="mb-3 text-sm font-medium text-stone-700">
        {isEdit ? "Edit key date" : "Add key date"}
      </h3>
      <div className="space-y-3">
        <div>
          <label className="mb-0.5 block text-xs font-medium text-stone-500">
            Event / due date
          </label>
          <input
            type="date"
            value={eventDate}
            onChange={(e) => setEventDate(e.target.value)}
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
            className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
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
