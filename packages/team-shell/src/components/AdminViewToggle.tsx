"use client";

import { ADMIN_VIEW_STORAGE_KEY } from "../impersonation/constants";

export function AdminViewToggle({
  showAdminView,
  onToggle,
}: {
  showAdminView: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="rounded-lg px-3 py-2 text-sm font-medium text-stone-600 transition-colors hover:bg-stone-100 hover:text-stone-800"
      title={
        showAdminView
          ? "Switch to member view (hide admin links)"
          : "Switch to admin view (show admin links)"
      }
    >
      {showAdminView ? "Member view" : "Admin view"}
    </button>
  );
}

export function readAdminViewPreference(): boolean {
  if (typeof window === "undefined") return true;
  const stored = localStorage.getItem(ADMIN_VIEW_STORAGE_KEY);
  if (stored === "user") return false;
  if (stored === "admin") return true;
  return true;
}

export function writeAdminViewPreference(showAdminView: boolean): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(ADMIN_VIEW_STORAGE_KEY, showAdminView ? "admin" : "user");
}
