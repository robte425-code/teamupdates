import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const user = session.user as { role?: string } | undefined;
  if (user?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const visits = await prisma.pageVisit.findMany({
    where: {
      NOT: {
        OR: [
          { userEmail: { equals: "robert@team-voc.com", mode: "insensitive" } },
          { userName: { equals: "Robert Evans", mode: "insensitive" } },
        ],
      },
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

