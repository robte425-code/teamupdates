import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function keyDateExpiry(item: {
  dateType: string;
  eventDate: Date;
  eventEndDate: Date | null;
}): Date {
  return item.dateType === "event" && item.eventEndDate ? item.eventEndDate : item.eventDate;
}

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const list = searchParams.get("list");
  const archivedOnly = searchParams.get("archived") === "true";
  const user = session.user as { role?: string } | undefined;
  if (archivedOnly && user?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Archive as soon as past end/due (manual and auto; no grace period).
  const now = new Date();
  const notArchived = await prisma.keyDate.findMany({
    where: { archived: false },
    select: { id: true, dateType: true, eventDate: true, eventEndDate: true },
  });
  const idsToArchive = notArchived
    .filter((row) => keyDateExpiry(row) < now)
    .map((row) => row.id);
  if (idsToArchive.length > 0) {
    await prisma.keyDate.updateMany({
      where: { id: { in: idsToArchive } },
      data: { archived: true },
    });
  }

  let items = await prisma.keyDate.findMany({
    where: { archived: archivedOnly },
    orderBy: { eventDate: "asc" },
  });

  // Homepage: only items not yet past end/due
  if (list === "homepage") {
    items = items.filter((item) => {
      const expiry = item.dateType === "event" && item.eventEndDate ? item.eventEndDate : item.eventDate;
      return expiry >= now;
    });
  }

  const serialized = items.map(({ eventDate, eventEndDate, createdAt, archived, ...rest }) => ({
    ...rest,
    archived,
    eventDate: eventDate instanceof Date ? eventDate.toISOString() : eventDate,
    eventEndDate:
      eventEndDate instanceof Date ? eventEndDate.toISOString() : eventEndDate ?? undefined,
    createdAt: createdAt instanceof Date ? createdAt.toISOString() : createdAt,
  }));
  return NextResponse.json(serialized);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as { role?: string }).role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await req.json();
  const { dateType, eventDate, eventEndDate, title, text } = body;
  if (!eventDate || !title || text === undefined) {
    return NextResponse.json(
      { error: "eventDate, title, and text are required" },
      { status: 400 }
    );
  }
  const keyDateType = dateType === "event" ? "event" : "due";
  if (keyDateType === "event" && !eventEndDate) {
    return NextResponse.json(
      { error: "eventEndDate is required when dateType is event" },
      { status: 400 }
    );
  }
  const item = await prisma.keyDate.create({
    data: {
      dateType: keyDateType,
      eventDate: new Date(eventDate),
      eventEndDate: keyDateType === "event" ? new Date(eventEndDate) : null,
      title: String(title).trim(),
      body: String(text).trim(),
    },
  });
  return NextResponse.json(item);
}
