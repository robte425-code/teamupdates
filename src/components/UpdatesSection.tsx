"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { UpdateItem } from "./UpdateItem";
import { UpdateForm } from "./UpdateForm";

export type Update = {
  id: string;
  date: string;
  title: string;
  body: string;
};

export function UpdatesSection({ showAddForm = true }: { showAddForm?: boolean }) {
  const { data: session } = useSession();
  const [items, setItems] = useState<Update[]>([]);
  const [loading, setLoading] = useState(true);
  const user = session?.user as { role?: string } | undefined;
  const isAdmin = user?.role === "admin";

  useEffect(() => {
    fetch("/api/updates")
      .then((r) => r.json())
      .then((data) => {
        setItems(Array.isArray(data) ? data : []);
      })
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  function refetch() {
    fetch("/api/updates")
      .then((r) => r.json())
      .then((data) => setItems(Array.isArray(data) ? data : []));
  }

  return (
    <div className="rounded-2xl border border-stone-200/80 bg-white p-6 shadow-sm">
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-9 w-1 rounded-full bg-amber-400" aria-hidden />
        <h2 className="text-xl font-semibold tracking-tight text-stone-900">
          Updates & Reminders
        </h2>
      </div>
      {loading ? (
        <p className="py-8 text-center text-sm text-stone-500">Loading…</p>
      ) : (
        <ul className="space-y-3">
          {items.length === 0 && !isAdmin && (
            <li className="rounded-xl border border-dashed border-stone-200 bg-stone-50/50 px-4 py-6 text-center text-sm text-stone-500">
              No updates yet.
            </li>
          )}
          {items.map((item) => (
            <UpdateItem
              key={item.id}
              item={item}
              isAdmin={isAdmin}
              onSaved={refetch}
              onDeleted={refetch}
            />
          ))}
        </ul>
      )}
      {isAdmin && showAddForm && (
        <div className="mt-4">
          <UpdateForm onSaved={refetch} />
        </div>
      )}
    </div>
  );
}
