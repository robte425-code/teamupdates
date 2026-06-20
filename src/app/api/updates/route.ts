import { NextResponse } from "next/server";
import { requireAuth, requireRealAdmin } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { createdByFromUser } from "@/lib/createdBy";

export async function GET(req: Request) {
  const user = await requireAuth();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const archivedOnly = searchParams.get("archived") === "true";
  const items = await prisma.update.findMany({
    where: { archived: archivedOnly },
    orderBy: { date: "desc" },
  });
  return NextResponse.json(items);
}

export async function POST(req: Request) {
  const admin = await requireRealAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await req.json();
  const { title, text } = body;
  if (!title || text === undefined) {
    return NextResponse.json(
      { error: "title and text are required" },
      { status: 400 }
    );
  }
  const { createdByName, createdByEmail } = createdByFromUser(admin);
  const item = await prisma.update.create({
    data: {
      date: new Date(),
      title: String(title).trim(),
      body: String(text).trim(),
      createdByName,
      createdByEmail,
    },
  });
  return NextResponse.json(item);
}
