import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { pageVisitWhereNotRobert } from "@/lib/pageVisitRobertExclusions";

const SIXTY_DAYS_MS = 60 * 24 * 60 * 60 * 1000;

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const user = session.user as { role?: string } | undefined;
  if (user?.role !== "admin") {
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

