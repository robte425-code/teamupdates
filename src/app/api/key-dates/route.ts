import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const list = searchParams.get("list");

  // Remove auto-delete items that expired more than 1 day ago
  const cutoff = new Date(Date.now() - ONE_DAY_MS);
  await prisma.keyDate.deleteMany({
    where: { deleteType: "auto", eventDate: { lt: cutoff } },
  });

  let items = await prisma.keyDate.findMany({
    orderBy: { eventDate: "asc" },
  });

  // Homepage: show auto items until 1 day after expiry; show manual only if not yet expired
  if (list === "homepage") {
    const now = new Date();
    items = items.filter(
      (item) =>
        item.deleteType === "auto" ||
        (item.deleteType === "manual" && item.eventDate >= now)
    );
  }

  const serialized = items.map(({ eventDate, createdAt, ...rest }) => ({
    ...rest,
    eventDate:
      eventDate instanceof Date ? eventDate.toISOString() : eventDate,
    createdAt:
      createdAt instanceof Date ? createdAt.toISOString() : createdAt,
  }));
  return NextResponse.json(serialized);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as { role?: string }).role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await req.json();
  const { eventDate, title, text, deleteType } = body;
  if (!eventDate || !title || text === undefined) {
    return NextResponse.json(
      { error: "eventDate, title, and text are required" },
      { status: 400 }
    );
  }
  const type =
    deleteType === "auto" || deleteType === "manual" ? deleteType : "manual";
  const item = await prisma.keyDate.create({
    data: {
      eventDate: new Date(eventDate),
      title: String(title).trim(),
      body: String(text).trim(),
      deleteType: type,
    },
  });
  return NextResponse.json(item);
}
