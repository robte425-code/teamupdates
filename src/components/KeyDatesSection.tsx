"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useViewMode } from "@/contexts/ViewModeContext";
import { KeyDateItem } from "./KeyDateItem";
import { KeyDateForm } from "./KeyDateForm";

export type KeyDate = {
  id: string;
  dateType?: "due" | "event";
  eventDate: string;
  eventEndDate?: string | null;
  title: string;
  body: string;
  deleteType?: "auto" | "manual";
  archived?: boolean;
  createdAt?: string;
};

export function KeyDatesSection({ showAddForm = true }: { showAddForm?: boolean }) {
  const { data: session } = useSession();
  const [items, setItems] = useState<KeyDate[]>([]);
  const [loading, setLoading] = useState(true);
  const user = session?.user as { role?: string } | undefined;
  const { showAdminView } = useViewMode();
  const isAdmin = user?.role === "admin";
  const showAdminUI = isAdmin && showAdminView;

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
    <div className="rounded-2xl border border-stone-200/80 bg-stone-100/80 p-6 shadow-sm">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-9 w-1 shrink-0 rounded-full bg-emerald-400" aria-hidden />
          <h2 className="text-xl font-semibold tracking-tight text-stone-900">
            Key dates
          </h2>
        </div>
        {showAdminUI && (
          <Link
            href="/manage/archived-key-dates"
            className="shrink-0 text-sm font-medium text-emerald-700 transition-colors hover:text-emerald-800 hover:underline"
          >
            Archived key dates
          </Link>
        )}
      </div>
      {loading ? (
        <p className="py-8 text-center text-sm text-stone-500">Loading…</p>
      ) : (
        <ul className="space-y-3">
          {items.length === 0 && !showAdminUI && (
            <li className="rounded-xl border border-dashed border-stone-200 bg-stone-50/50 px-4 py-6 text-center text-sm text-stone-500">
              No key dates yet.
            </li>
          )}
          {items.map((item) => (
            <KeyDateItem
              key={item.id}
              item={item}
              isAdmin={showAdminUI}
              onSaved={refetch}
              onDeleted={refetch}
            />
          ))}
        </ul>
      )}
      {showAdminUI && showAddForm && (
        <div className="mt-4">
          <KeyDateForm onSaved={refetch} />
        </div>
      )}
    </div>
  );
}
