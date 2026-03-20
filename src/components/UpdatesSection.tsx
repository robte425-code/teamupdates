"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useViewMode } from "@/contexts/ViewModeContext";
import { UpdateItem } from "./UpdateItem";
import { UpdateForm } from "./UpdateForm";

export type Update = {
  id: string;
  date: string;
  title: string;
  body: string;
};

function matchesSearch(item: Update, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const tokens = q.split(/\s+/).filter(Boolean);
  const haystack = `${item.title}\n${item.body}`.toLowerCase();
  return tokens.every((t) => haystack.includes(t));
}

export function UpdatesSection({
  showAddForm = true,
  variant = "default",
}: {
  showAddForm?: boolean;
  /** `archived` = list only archived items (manage page). */
  variant?: "default" | "archived";
}) {
  const { data: session } = useSession();
  const [items, setItems] = useState<Update[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const user = session?.user as { role?: string } | undefined;
  const { showAdminView } = useViewMode();
  const isAdmin = user?.role === "admin";
  const showAdminUI = isAdmin && showAdminView;
  const isArchivedPage = variant === "archived";
  const listUrl = isArchivedPage ? "/api/updates?archived=true" : "/api/updates";

  useEffect(() => {
    fetch(listUrl)
      .then((r) => r.json())
      .then((data) => {
        setItems(Array.isArray(data) ? data : []);
      })
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [listUrl]);

  function refetch() {
    fetch(listUrl)
      .then((r) => r.json())
      .then((data) => setItems(Array.isArray(data) ? data : []));
  }

  const filteredItems = items.filter((item) => matchesSearch(item, searchQuery));

  return (
    <div className="rounded-2xl border border-stone-200/80 bg-stone-100/80 p-6 shadow-sm">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-9 w-1 shrink-0 rounded-full bg-amber-400" aria-hidden />
          <h2 className="text-xl font-semibold tracking-tight text-stone-900">
            {isArchivedPage ? "Archived Updates & Reminders" : "Updates & Reminders"}
          </h2>
        </div>
        {isAdmin && !isArchivedPage && (
          <Link
            href="/manage/archived-updates"
            className="shrink-0 text-sm font-medium text-amber-700 transition-colors hover:text-amber-800 hover:underline"
          >
            Archive
          </Link>
        )}
      </div>
      <div className="mb-4">
        <label htmlFor="updates-search" className="sr-only">
          {isArchivedPage ? "Search archived updates" : "Search updates"}
        </label>
        <input
          id="updates-search"
          type="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by title or text…"
          className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
          autoComplete="off"
        />
      </div>
      {loading ? (
        <p className="py-8 text-center text-sm text-stone-500">Loading…</p>
      ) : (
        <ul className="space-y-3">
          {items.length === 0 && (!showAdminUI || isArchivedPage) && (
            <li className="rounded-xl border border-dashed border-stone-200 bg-stone-50/50 px-4 py-6 text-center text-sm text-stone-500">
              {isArchivedPage ? "No archived updates." : "No updates yet."}
            </li>
          )}
          {items.length > 0 && filteredItems.length === 0 && (
            <li className="rounded-xl border border-dashed border-stone-200 bg-stone-50/50 px-4 py-6 text-center text-sm text-stone-500">
              No updates match your search.
            </li>
          )}
          {filteredItems.map((item) => (
            <UpdateItem
              key={item.id}
              item={item}
              isAdmin={showAdminUI}
              listArchived={isArchivedPage}
              onSaved={refetch}
              onDeleted={refetch}
            />
          ))}
        </ul>
      )}
      {showAdminUI && showAddForm && (
        <div className="mt-4">
          <UpdateForm onSaved={refetch} />
        </div>
      )}
    </div>
  );
}
