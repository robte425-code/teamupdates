"use client";

/**
 * Client-side helpers for admin "view as" (impersonation).
 * Each app exposes GET/POST/DELETE at `apiPath` (default /api/impersonate).
 */
export async function startImpersonation(
  email: string,
  apiPath = "/api/impersonate"
): Promise<string | null> {
  const res = await fetch(apiPath, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    return (data as { error?: string }).error || "Could not switch user";
  }
  window.location.reload();
  return null;
}

export async function startImpersonationByEmployeeId(
  employeeId: string | number,
  apiPath = "/api/impersonate"
): Promise<string | null> {
  const res = await fetch(apiPath, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ employeeId }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    return (data as { error?: string }).error || "Could not switch user";
  }
  window.location.reload();
  return null;
}

export async function stopImpersonation(apiPath = "/api/impersonate"): Promise<void> {
  await fetch(apiPath, { method: "DELETE" });
  window.location.reload();
}

export async function fetchImpersonationStatus(
  apiPath = "/api/impersonate"
): Promise<import("./impersonation/constants").ImpersonationStatus | null> {
  const res = await fetch(apiPath, { cache: "no-store" });
  if (!res.ok) return null;
  return res.json();
}
