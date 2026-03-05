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
};

function daysLeft(dateStr: string): number {
  const d = new Date(dateStr);
  d.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = d.getTime() - today.getTime();
  return Math.ceil(diff / (24 * 60 * 60 * 1000));
}

export function KeyDatesSection({ showAddForm = true }: { showAddForm?: boolean }) {
  const { data: session } = useSession();
  const [items, setItems] = useState<KeyDate[]>([]);
  const [loading, setLoading] = useState(true);
  const isAdmin = (session?.user as { role?: string })?.role === "admin";

  useEffect(() => {
    fetch("/api/key-dates")
      .then((r) => r.json())
      .then((data) => {
        setItems(Array.isArray(data) ? data : []);
      })
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  function refetch() {
    fetch("/api/key-dates")
      .then((r) => r.json())
      .then((data) => setItems(Array.isArray(data) ? data : []));
  }

  return (
    <div>
      <h2 className="mb-4 text-lg font-semibold text-stone-800">
        Key dates
      </h2>
      {loading ? (
        <p className="text-stone-500">Loading…</p>
      ) : (
        <ul className="space-y-4">
          {items.length === 0 && !isAdmin && (
            <li className="rounded-lg border border-stone-200 bg-stone-50/50 p-4 text-sm text-stone-500">
              No key dates yet.
            </li>
          )}
          {items.map((item) => (
            <KeyDateItem
              key={item.id}
              item={item}
              daysLeft={daysLeft(item.eventDate)}
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
