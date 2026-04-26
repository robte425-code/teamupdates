import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const manage = searchParams.get("manage") === "1";
  const user = session.user as { role?: string } | undefined;
  if (manage && user?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const items = await prisma.tickerItem.findMany({
    where: manage ? {} : { displayed: true },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(items);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as { role?: string }).role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await req.json();
  const { text } = body as { text?: string };
  if (!text || !text.trim()) {
    return NextResponse.json(
      { error: "text is required" },
      { status: 400 }
    );
  }
  const item = await prisma.tickerItem.create({
    data: {
      text: String(text).trim(),
      displayed: true,
    },
  });
  return NextResponse.json(item);
}

