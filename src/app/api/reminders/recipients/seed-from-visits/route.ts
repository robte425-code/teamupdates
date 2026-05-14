import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { pageVisitWhereNotRobert } from "@/lib/pageVisitRobertExclusions";

const SIXTY_DAYS_MS = 60 * 24 * 60 * 60 * 1000;

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if ((session.user as { role?: string }).role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return null;
}

export async function POST() {
  const err = await requireAdmin();
  if (err) return err;

  const since = new Date(Date.now() - SIXTY_DAYS_MS);
  const visits = await prisma.pageVisit.findMany({
    where: {
      path: "/",
      visitedAt: { gte: since },
      userEmail: { not: null },
      ...pageVisitWhereNotRobert(),
    },
    orderBy: { visitedAt: "desc" },
    select: { userEmail: true, userName: true },
  });

  const latest = new Map<string, { email: string; name: string | null }>();
  for (const v of visits) {
    const raw = v.userEmail?.trim();
    if (!raw) continue;
    const email = normalizeEmail(raw);
    if (!latest.has(email)) {
      const nm = v.userName?.trim();
      latest.set(email, { email, name: nm ? nm : null });
    }
  }

  const existing = await prisma.reminderRecipient.findMany({
    select: { email: true },
  });
  const have = new Set(existing.map((e) => normalizeEmail(e.email)));

  const toCreate = Array.from(latest.values()).filter((r) => !have.has(r.email));
  if (toCreate.length === 0) {
    return NextResponse.json({
      added: 0,
      distinctEmailsFromVisits: latest.size,
      alreadyHadRecipient: latest.size,
    });
  }

  const result = await prisma.reminderRecipient.createMany({
    data: toCreate.map((r) => ({
      email: r.email,
      name: r.name,
      enabled: true,
    })),
    skipDuplicates: true,
  });

  return NextResponse.json({
    added: result.count,
    distinctEmailsFromVisits: latest.size,
    alreadyHadRecipient: latest.size - toCreate.length,
  });
}
