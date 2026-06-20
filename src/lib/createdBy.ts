import type { Session } from "next-auth";

export function createdByFromSession(session: Session | null): {
  createdByName: string | null;
  createdByEmail: string | null;
} {
  const user = session?.user as { name?: string | null; email?: string | null } | undefined;
  return createdByFromUser(user);
}

export function createdByFromUser(user: {
  name?: string | null;
  email?: string | null;
} | null | undefined): {
  createdByName: string | null;
  createdByEmail: string | null;
} {
  const name = user?.name?.trim() || null;
  const email = user?.email?.trim() || null;
  return { createdByName: name, createdByEmail: email };
}

/** Single-line label for admin UI; null if nothing stored. */
export function formatAddedByLine(
  name: string | null | undefined,
  email: string | null | undefined
): string | null {
  const n = name?.trim();
  const e = email?.trim();
  if (n && e) return `${n} (${e})`;
  if (n) return n;
  if (e) return e;
  return null;
}
