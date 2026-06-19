import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createdByFromSession } from "@/lib/createdBy";
import { sanitizePopupHtml } from "@/lib/sanitizePopupHtml";
import { getPopupSettings } from "@/lib/popupSettings";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as { role?: string }).role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const [messages, settings] = await Promise.all([
    prisma.popupMessage.findMany({ orderBy: { updatedAt: "desc" } }),
    getPopupSettings(),
  ]);
  return NextResponse.json({
    messages,
    activePopupId: settings.activePopupId,
  });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as { role?: string }).role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await req.json();
  const title = body?.title != null ? String(body.title).trim() : "";
  const rawBody = body?.body != null ? String(body.body) : "";
  const cleanBody = sanitizePopupHtml(rawBody);
  if (!title || !cleanBody) {
    return NextResponse.json({ error: "title and body are required" }, { status: 400 });
  }
  const { createdByName, createdByEmail } = createdByFromSession(session);
  const item = await prisma.popupMessage.create({
    data: {
      title,
      body: cleanBody,
      createdByName,
      createdByEmail,
    },
  });
  return NextResponse.json(item);
}
