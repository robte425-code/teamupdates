import { NextResponse } from "next/server";
import { requireRealAdmin } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { sanitizePopupHtml } from "@/lib/sanitizePopupHtml";
import { getPopupSettings, setActivePopupId } from "@/lib/popupSettings";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireRealAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  const body = await req.json();
  const data: { title?: string; body?: string } = {};
  if (body.title != null) data.title = String(body.title).trim();
  if (body.body != null) data.body = sanitizePopupHtml(String(body.body));
  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }
  if (data.title === "" || data.body === "") {
    return NextResponse.json({ error: "title and body cannot be empty" }, { status: 400 });
  }
  const item = await prisma.popupMessage.update({ where: { id }, data });
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
  const settings = await getPopupSettings();
  await prisma.popupMessage.delete({ where: { id } });
  if (settings.activePopupId === id) {
    await setActivePopupId(null);
  }
  return NextResponse.json({ ok: true });
}
