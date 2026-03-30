import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as { role?: string }).role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  const body = await _req.json();
  const { dateType, eventDate, eventEndDate, title, text, archived } = body;
  const data: {
    dateType?: string;
    eventDate?: Date;
    eventEndDate?: Date | null;
    title?: string;
    body?: string;
    archived?: boolean;
  } = {};
  if (dateType === "event" || dateType === "due") {
    data.dateType = dateType;
    if (dateType === "due") data.eventEndDate = null;
  }
  if (eventDate != null) data.eventDate = new Date(eventDate);
  if (eventEndDate !== undefined)
    data.eventEndDate = eventEndDate == null ? null : new Date(eventEndDate);
  if (title != null) data.title = String(title).trim();
  if (text != null) data.body = String(text).trim();
  if (archived !== undefined) data.archived = Boolean(archived);
  const item = await prisma.keyDate.update({
    where: { id },
    data,
  });
  return NextResponse.json(item);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as { role?: string }).role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  await prisma.keyDate.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
