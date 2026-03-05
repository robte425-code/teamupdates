import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const items = await prisma.keyDate.findMany({
    orderBy: { eventDate: "asc" },
  });
  return NextResponse.json(items);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as { role?: string }).role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await req.json();
  const { eventDate, title, text } = body;
  if (!eventDate || !title || text === undefined) {
    return NextResponse.json(
      { error: "eventDate, title, and text are required" },
      { status: 400 }
    );
  }
  const item = await prisma.keyDate.create({
    data: {
      eventDate: new Date(eventDate),
      title: String(title).trim(),
      body: String(text).trim(),
    },
  });
  return NextResponse.json(item);
}
