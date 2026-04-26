import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as { role?: string }).role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  const body = await req.json();
  const { text, displayed } = body as { text?: string; displayed?: boolean };
  const data: { text?: string; displayed?: boolean } = {};
  if (text != null) data.text = String(text).trim();
  if (typeof displayed === "boolean") data.displayed = displayed;
  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }
  try {
    const item = await prisma.tickerItem.update({
      where: { id },
      data,
    });
    return NextResponse.json(item);
  } catch (err) {
    console.error("ticker PATCH", err);
    return NextResponse.json(
      {
        error:
          "Could not update ticker item. Ensure the database is migrated (TickerItem.displayed column).",
      },
      { status: 500 }
    );
  }
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
  await prisma.tickerItem.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

