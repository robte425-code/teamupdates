import { NextResponse } from "next/server";
import { requireRealAdmin } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { pageVisitWhereNotRobert } from "@/lib/pageVisitRobertExclusions";

const SIXTY_DAYS_MS = 60 * 24 * 60 * 60 * 1000;

export async function GET() {
  const admin = await requireRealAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const since = new Date(Date.now() - SIXTY_DAYS_MS);

  const visits = await prisma.pageVisit.findMany({
    where: {
      path: "/",
      visitedAt: { gte: since },
      ...pageVisitWhereNotRobert(),
    },
    orderBy: { visitedAt: "desc" },
  });

  return NextResponse.json(
    visits.map((v) => ({
      id: v.id,
      userId: v.userId,
      userName: v.userName,
      userEmail: v.userEmail,
      path: v.path,
      visitedAt: v.visitedAt.toISOString(),
    }))
  );
}

