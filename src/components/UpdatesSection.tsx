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

export function UpdatesSection() {
  const { data: session } = useSession();
  const [items, setItems] = useState<Update[]>([]);
  const [loading, setLoading] = useState(true);
  const isAdmin = (session?.user as { role?: string })?.role === "admin";

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
    <div>
      <h2 className="mb-4 text-lg font-semibold text-stone-800">
        Updates & Reminders
      </h2>
      {loading ? (
        <p className="text-stone-500">Loading…</p>
      ) : (
        <ul className="space-y-4">
          {items.length === 0 && !isAdmin && (
            <li className="rounded-lg border border-stone-200 bg-stone-50/50 p-4 text-sm text-stone-500">
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
      {isAdmin && (
        <div className="mt-4">
          <UpdateForm onSaved={refetch} />
        </div>
      )}
    </div>
  );
}
