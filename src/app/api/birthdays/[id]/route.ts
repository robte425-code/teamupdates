import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { clampBirthdayDay, clampBirthdayMonth } from "@/lib/birthday";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as { role?: string }).role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  const body = (await req.json()) as { name?: string; month?: number; day?: number };
  const data: { name?: string; month?: number; day?: number } = {};
  if (body.name != null) data.name = String(body.name).trim();
  if (body.month != null) data.month = clampBirthdayMonth(Number(body.month));
  if (body.day != null) data.day = clampBirthdayDay(Number(body.day));
  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }
  const item = await prisma.birthdayEntry.update({ where: { id }, data });
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
  await prisma.birthdayEntry.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
