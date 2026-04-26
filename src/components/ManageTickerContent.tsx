"use client";

import { useEffect, useState } from "react";

type TickerItem = {
  id: string;
  text: string;
  displayed: boolean;
  createdAt?: string;
};

export function ManageTickerContent() {
  const [items, setItems] = useState<TickerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [newText, setNewText] = useState("");
  const [savingNew, setSavingNew] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");

  function refetch() {
    return fetch("/api/ticker?manage=1")
      .then((r) => r.json())
      .then((data) =>
        setItems(
          Array.isArray(data)
            ? data.map((row: TickerItem) => ({
                ...row,
                displayed: row.displayed !== false,
              }))
            : []
        )
      );
  }

  useEffect(() => {
    refetch().finally(() => setLoading(false));
  }, []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!newText.trim()) return;
    setSavingNew(true);
    try {
      const res = await fetch("/api/ticker", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: newText }),
      });
      if (!res.ok) throw new Error(await res.text());
      setNewText("");
      refetch();
    } catch {
      // ignore error; simple UI
    } finally {
      setSavingNew(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this ticker item?")) return;
    const res = await fetch(`/api/ticker/${id}`, { method: "DELETE" });
    if (res.ok) refetch();
  }

  async function handleSaveEdit(id: string) {
    if (!editingText.trim()) return;
    const res = await fetch(`/api/ticker/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: editingText }),
    });
    if (res.ok) {
      setEditingId(null);
      setEditingText("");
      refetch();
    }
  }

  async function handleSetDisplayed(id: string, displayed: boolean) {
    const res = await fetch(`/api/ticker/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ displayed }),
    });
    if (res.ok) refetch();
  }

  return (
    <div className="space-y-8">
      <section>
        <h2 className="mb-3 text-lg font-semibold text-stone-800">
          Add ticker item
        </h2>
        <form
          onSubmit={handleAdd}
          className="flex flex-col gap-3 rounded-xl border border-stone-200 bg-white p-4 shadow-sm sm:flex-row"
        >
          <input
            type="text"
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            placeholder="Enter ticker text…"
            className="flex-1 rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
          <button
            type="submit"
            disabled={savingNew}
            className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-60"
          >
            {savingNew ? "Adding…" : "Add"}
          </button>
        </form>
      </section>

      <section>
        <h2 className="mb-1 text-lg font-semibold text-stone-800">
          Existing ticker items
        </h2>
        <p className="mb-3 text-xs text-stone-500">
          Uncheck Display to hide a line from the header ticker. It remains here for editing.
        </p>
        {loading ? (
          <p className="text-sm text-stone-500">Loading…</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-stone-500">No ticker items yet.</p>
        ) : (
          <ul className="space-y-3">
            {items.map((item) => (
              <li
                key={item.id}
                className={`rounded-xl border border-stone-200 p-4 shadow-sm ${
                  item.displayed ? "bg-white" : "bg-stone-50/90"
                }`}
              >
                <div className="flex flex-wrap items-center gap-3">
                  <label
                    htmlFor={`ticker-display-${item.id}`}
                    className="flex shrink-0 cursor-pointer select-none items-center gap-2 text-xs font-medium text-stone-600"
                  >
                    <input
                      id={`ticker-display-${item.id}`}
                      type="checkbox"
                      checked={item.displayed}
                      onChange={(e) => handleSetDisplayed(item.id, e.target.checked)}
                      className="h-4 w-4 rounded border-stone-300 text-amber-600 focus:ring-amber-500"
                    />
                    Display
                  </label>
                  {editingId === item.id ? (
                    <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center">
                      <input
                        type="text"
                        value={editingText}
                        onChange={(e) => setEditingText(e.target.value)}
                        className="min-w-0 flex-1 rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-900 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                      />
                      <div className="flex shrink-0 gap-2">
                        <button
                          type="button"
                          onClick={() => handleSaveEdit(item.id)}
                          className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingId(null);
                            setEditingText("");
                          }}
                          className="rounded-lg border border-stone-300 px-3 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-50"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="min-w-0 flex-1 text-sm text-stone-700">{item.text}</div>
                      <div className="flex shrink-0 gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingId(item.id);
                            setEditingText(item.text);
                          }}
                          className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-stone-500 hover:bg-stone-100 hover:text-stone-700"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(item.id)}
                          className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 hover:text-red-700"
                        >
                          Delete
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

