import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRealAdmin } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET() {
  const real = await requireRealAdmin();
  if (!real) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const rows = await prisma.pageVisit.findMany({
    where: { userEmail: { not: null } },
    distinct: ["userEmail"],
    select: { userEmail: true, userName: true },
    orderBy: { userEmail: "asc" },
  });

  const users = rows
    .filter((r) => r.userEmail?.includes("@"))
    .map((r) => ({
      email: r.userEmail!.toLowerCase(),
      displayName: r.userName?.trim() || r.userEmail!.split("@")[0],
    }))
    .filter((u) => u.email !== real.email.toLowerCase());

  return NextResponse.json({ users });
}
