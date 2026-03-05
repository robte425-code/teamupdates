"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { KeyDateItem } from "./KeyDateItem";
import { KeyDateForm } from "./KeyDateForm";

export type KeyDate = {
  id: string;
  eventDate: string;
  title: string;
  body: string;
  deleteType?: "auto" | "manual";
};

export function KeyDatesSection({ showAddForm = true }: { showAddForm?: boolean }) {
  const { data: session } = useSession();
  const [items, setItems] = useState<KeyDate[]>([]);
  const [loading, setLoading] = useState(true);
  const user = session?.user as { role?: string } | undefined;
  const isAdmin = user?.role === "admin";

  useEffect(() => {
    fetch("/api/key-dates?list=homepage")
      .then((r) => r.json())
      .then((data) => {
        setItems(Array.isArray(data) ? data : []);
      })
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  function refetch() {
    fetch("/api/key-dates?list=homepage")
      .then((r) => r.json())
      .then((data) => setItems(Array.isArray(data) ? data : []));
  }

  return (
    <div className="rounded-2xl border border-stone-200/80 bg-white p-6 shadow-sm">
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-9 w-1 rounded-full bg-emerald-400" aria-hidden />
        <h2 className="text-xl font-semibold tracking-tight text-stone-900">
          Key dates
        </h2>
      </div>
      {loading ? (
        <p className="py-8 text-center text-sm text-stone-500">Loading…</p>
      ) : (
        <ul className="space-y-3">
          {items.length === 0 && !isAdmin && (
            <li className="rounded-xl border border-dashed border-stone-200 bg-stone-50/50 px-4 py-6 text-center text-sm text-stone-500">
              No key dates yet.
            </li>
          )}
          {items.map((item) => (
            <KeyDateItem
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
          <KeyDateForm onSaved={refetch} />
        </div>
      )}
    </div>
  );
}
