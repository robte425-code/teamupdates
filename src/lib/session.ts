import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { readImpersonateEmail } from "@/lib/impersonation";

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: string;
}

export async function getRealSessionUser(): Promise<SessionUser | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return null;
  const u = session.user as { id?: string; role?: string; name?: string | null; email?: string };
  return {
    id: u.id ?? "",
    email: u.email ?? "",
    name: u.name ?? u.email ?? "",
    role: u.role ?? "member",
  };
}

async function lookupDisplayName(email: string): Promise<string> {
  const visit = await prisma.pageVisit.findFirst({
    where: { userEmail: { equals: email, mode: "insensitive" } },
    orderBy: { visitedAt: "desc" },
    select: { userName: true },
  });
  if (visit?.userName?.trim()) return visit.userName.trim();
  return email.split("@")[0] ?? email;
}

export async function getEffectiveSessionUser(): Promise<SessionUser | null> {
  const real = await getRealSessionUser();
  if (!real) return null;
  if (real.role !== "admin") return real;

  const target = readImpersonateEmail();
  if (!target || target === real.email.toLowerCase()) return real;

  const name = await lookupDisplayName(target);
  return {
    id: `impersonated:${target}`,
    email: target,
    name,
    role: "member",
  };
}

export function isAdmin(user: SessionUser | null): boolean {
  return user?.role === "admin";
}

/** Admin who is not currently viewing as another user (for mutating admin APIs). */
export async function requireRealAdmin(): Promise<SessionUser | null> {
  const real = await getRealSessionUser();
  if (!real || real.role !== "admin") return null;
  const target = readImpersonateEmail();
  if (target && target !== real.email.toLowerCase()) return null;
  return real;
}

/** Signed-in user for read APIs; admins viewing-as get member role. */
export async function requireAuth(): Promise<SessionUser | null> {
  return getEffectiveSessionUser();
}

export async function getImpersonationContext() {
  const real = await getRealSessionUser();
  if (!real || real.role !== "admin") {
    return {
      canImpersonate: false,
      impersonating: false,
      real: real ?? { email: "", name: "" },
      effective: real ?? { email: "", name: "", role: "member" },
      target: null as { email: string; name: string } | null,
    };
  }
  const targetEmail = readImpersonateEmail();
  const impersonating = Boolean(targetEmail && targetEmail !== real.email.toLowerCase());
  const effective = impersonating
    ? await getEffectiveSessionUser()
    : real;
  const target =
    impersonating && effective
      ? { email: effective.email, name: effective.name }
      : null;

  return {
    canImpersonate: true,
    impersonating,
    real: { email: real.email, name: real.name },
    effective: {
      email: effective?.email ?? real.email,
      name: effective?.name ?? real.name,
      role: effective?.role ?? real.role,
    },
    target,
  };
}
