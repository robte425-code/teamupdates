"use client";

import { useEffect, useState } from "react";
import { AddUserForm } from "./AddUserForm";
import { format } from "date-fns";

type User = {
  id: string;
  email: string;
  name: string | null;
  role: string;
  createdAt: string;
};

export function AdminUsersSection() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  function refetch() {
    fetch("/api/users")
      .then((r) => r.json())
      .then((data) => setUsers(Array.isArray(data) ? data : []));
  }

  useEffect(() => {
    fetch("/api/users")
      .then((r) => r.json())
      .then((data) => {
        setUsers(Array.isArray(data) ? data : []);
      })
      .catch(() => setUsers([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h2 className="mb-4 text-lg font-semibold text-stone-800">
        Manage users
      </h2>
      <p className="mb-4 text-sm text-stone-500">
        Add team members so they can log in and view updates and key dates.
      </p>
      <AddUserForm onAdded={refetch} />
      {loading ? (
        <p className="mt-4 text-sm text-stone-500">Loading users…</p>
      ) : (
        <ul className="mt-4 space-y-2">
          {users.map((u) => (
            <li
              key={u.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm"
            >
              <span className="font-medium text-stone-800">{u.email}</span>
              <span className="flex items-center gap-2">
                {u.name && (
                  <span className="text-stone-500">{u.name}</span>
                )}
                <span
                  className={`rounded px-1.5 py-0.5 text-xs ${
                    u.role === "admin"
                      ? "bg-amber-100 text-amber-800"
                      : "bg-stone-100 text-stone-600"
                  }`}
                >
                  {u.role}
                </span>
                <span className="text-stone-400">
                  {format(new Date(u.createdAt), "MMM d")}
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
