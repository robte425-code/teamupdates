import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  clampBirthdayDay,
  clampBirthdayMonth,
  firstName,
  todayMonthDayInPacific,
} from "@/lib/birthday";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const todayOnly = searchParams.get("today") === "1";

  if (todayOnly) {
    const { month, day } = todayMonthDayInPacific();
    const items = await prisma.birthdayEntry.findMany({
      where: { month, day },
      orderBy: { name: "asc" },
      select: { id: true, name: true, month: true, day: true },
    });
    return NextResponse.json(
      items.map((row) => ({
        ...row,
        firstName: firstName(row.name),
        message: `🎉 Happy birthday, ${firstName(row.name)}!`,
      }))
    );
  }

  const user = session.user as { role?: string } | undefined;
  if (user?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const items = await prisma.birthdayEntry.findMany({
    orderBy: [{ month: "asc" }, { day: "asc" }, { name: "asc" }],
  });
  return NextResponse.json(items);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as { role?: string }).role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = (await req.json()) as { name?: string; month?: number; day?: number };
  const name = String(body.name ?? "").trim();
  if (!name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }
  const month = clampBirthdayMonth(Number(body.month ?? 1));
  const day = clampBirthdayDay(Number(body.day ?? 1));
  const item = await prisma.birthdayEntry.create({
    data: { name, month, day },
  });
  return NextResponse.json(item);
}
