import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getPopupSettings, setActivePopupId } from "@/lib/popupSettings";

export async function PUT(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as { role?: string }).role !== "admin") {
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
  const session = await getServerSession(authOptions);
  if (!session || (session.user as { role?: string }).role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const settings = await getPopupSettings();
  return NextResponse.json(settings);
}
