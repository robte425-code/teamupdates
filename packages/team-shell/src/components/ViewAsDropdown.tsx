"use client";

import { useEffect, useRef, useState } from "react";
import { startImpersonation, stopImpersonation } from "../impersonate-client";
import type { ViewAsUser } from "../impersonation/constants";

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      className={`h-4 w-4 shrink-0 text-stone-500 transition-transform ${open ? "rotate-180" : ""}`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      aria-hidden
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  );
}

export function ViewAsDropdown({
  realEmail,
  realName,
  currentEmail,
  isImpersonating,
  usersApiPath = "/api/view-as-users",
  impersonateApiPath = "/api/impersonate",
  menuAlign = "right",
}: {
  realEmail: string;
  realName: string;
  currentEmail: string;
  isImpersonating: boolean;
  usersApiPath?: string;
  impersonateApiPath?: string;
  menuAlign?: "left" | "right";
}) {
  const [open, setOpen] = useState(false);
  const [users, setUsers] = useState<ViewAsUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyEmail, setBusyEmail] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onPointerDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  useEffect(() => {
    if (!open || users.length > 0) return;
    let active = true;
    setLoading(true);
    setError(null);
    fetch(usersApiPath)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("Could not load users"))))
      .then((data: { users: ViewAsUser[] }) => {
        if (active) setUsers(data.users);
      })
      .catch((e: Error) => {
        if (active) setError(e.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [open, users.length, usersApiPath]);

  async function selectUser(email: string) {
    setBusyEmail(email);
    setError(null);
    const err = await startImpersonation(email, impersonateApiPath);
    if (err) {
      setError(err);
      setBusyEmail(null);
    }
  }

  async function exitViewAs() {
    setBusyEmail("__self__");
    setError(null);
    await stopImpersonation(impersonateApiPath);
  }

  const realEmailLower = realEmail.toLowerCase();
  const others = users.filter((u) => u.email.toLowerCase() !== realEmailLower);
  const alignClass = menuAlign === "right" ? "right-0 sm:left-auto sm:right-0" : "left-0";

  return (
    <div className="relative shrink-0" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex items-center gap-1.5 rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-800 shadow-sm transition-colors hover:bg-stone-50"
      >
        <span>View as…</span>
        <Chevron open={open} />
      </button>
      {open && (
        <ul
          role="menu"
          aria-label="View as"
          className={`absolute ${alignClass} top-full z-30 mt-1 max-h-80 w-72 overflow-y-auto rounded-lg border border-stone-200 bg-white py-1 shadow-lg`}
        >
          <li role="presentation" className="border-b border-stone-100 px-3 py-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-stone-500">
              View as…
            </span>
          </li>
          {isImpersonating && (
            <li role="none">
              <button
                type="button"
                role="menuitem"
                disabled={busyEmail === "__self__"}
                onClick={exitViewAs}
                className="block w-full px-3 py-2 text-left text-sm font-medium text-stone-900 hover:bg-stone-50 disabled:opacity-60"
              >
                {busyEmail === "__self__" ? "Switching…" : `Yourself (${realName})`}
              </button>
            </li>
          )}
          {loading && <li className="px-3 py-2 text-sm text-stone-500">Loading users…</li>}
          {error && <li className="px-3 py-2 text-sm text-red-600">{error}</li>}
          {!loading &&
            others.map((user) => {
              const isCurrent =
                isImpersonating && user.email.toLowerCase() === currentEmail.toLowerCase();
              const busy = busyEmail === user.email;
              return (
                <li key={user.email} role="none">
                  <button
                    type="button"
                    role="menuitem"
                    disabled={Boolean(busyEmail)}
                    onClick={() => selectUser(user.email)}
                    className={`block w-full px-3 py-2 text-left text-sm ${
                      isCurrent
                        ? "bg-stone-100 font-medium text-stone-900"
                        : "text-stone-600 hover:bg-stone-50 hover:text-stone-900"
                    } disabled:opacity-60`}
                  >
                    <span className="block truncate">{user.displayName}</span>
                    <span className="block truncate text-xs text-stone-400">{user.email}</span>
                    {busy && <span className="text-xs text-stone-500">Switching…</span>}
                  </button>
                </li>
              );
            })}
          {!loading && !error && others.length === 0 && (
            <li className="px-3 py-2 text-sm text-stone-500">No other users found.</li>
          )}
        </ul>
      )}
    </div>
  );
}

/** Inline shortcut button for contextual "View as this user" actions. */
export function ViewAsUserButton({
  email,
  label = "View as this user",
  impersonateApiPath = "/api/impersonate",
  className = "text-sm font-medium text-stone-600 hover:text-stone-900 underline-offset-2 hover:underline",
}: {
  email: string;
  label?: string;
  impersonateApiPath?: string;
  className?: string;
}) {
  const [busy, setBusy] = useState(false);

  return (
    <button
      type="button"
      disabled={busy}
      className={className}
      onClick={async () => {
        setBusy(true);
        await startImpersonation(email, impersonateApiPath);
      }}
    >
      {busy ? "Switching…" : label}
    </button>
  );
}
