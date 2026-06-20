import { NextResponse } from "next/server";
import { requireRealAdmin } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { getPopupSettings, setActivePopupId } from "@/lib/popupSettings";

export async function PUT(req: Request) {
  const admin = await requireRealAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await req.json();
  const activePopupId =
    body.activePopupId === null || body.activePopupId === undefined
      ? null
      : String(body.activePopupId);

  if (activePopupId) {
    const exists = await prisma.popupMessage.findUnique({ where: { id: activePopupId } });
    if (!exists) {
      return NextResponse.json({ error: "Popup message not found" }, { status: 404 });
    }
  }

  const settings = await setActivePopupId(activePopupId);
  return NextResponse.json(settings);
}

export async function GET() {
  const admin = await requireRealAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const settings = await getPopupSettings();
  return NextResponse.json(settings);
}
