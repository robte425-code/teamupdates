import { NextResponse } from "next/server";
import { requireRealAdmin } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { createdByFromUser } from "@/lib/createdBy";

export async function PATCH(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireRealAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  const body = await _req.json();
  const { title, text, archived } = body;
  const data: {
    title?: string;
    body?: string;
    archived?: boolean;
    contentUpdatedAt?: Date;
    updatedByName?: string | null;
    updatedByEmail?: string | null;
  } = {};
  if (title != null) data.title = String(title).trim();
  if (text != null) data.body = String(text).trim();
  if (archived !== undefined) data.archived = Boolean(archived);
  if (title != null || text != null) {
    const { createdByName, createdByEmail } = createdByFromUser(admin);
    data.contentUpdatedAt = new Date();
    data.updatedByName = createdByName;
    data.updatedByEmail = createdByEmail;
  }
  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }
  const item = await prisma.update.update({
    where: { id },
    data,
  });
  return NextResponse.json(item);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireRealAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  await prisma.update.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
