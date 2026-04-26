import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  TICKER_SPEED_DEFAULT_PPS,
  TICKER_SPEED_MAX_PPS,
  TICKER_SPEED_MIN_PPS,
  clampTickerSpeedPxPerSec,
} from "@/lib/tickerSpeed";

const SETTINGS_ID = "default";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const row = await prisma.tickerSettings.findUnique({
      where: { id: SETTINGS_ID },
    });
    const scrollSpeedPxPerSec = clampTickerSpeedPxPerSec(
      row?.scrollSpeedPxPerSec ?? TICKER_SPEED_DEFAULT_PPS
    );
    return NextResponse.json({
      scrollSpeedPxPerSec,
      minPxPerSec: TICKER_SPEED_MIN_PPS,
      maxPxPerSec: TICKER_SPEED_MAX_PPS,
    });
  } catch (err) {
    console.error("ticker settings GET", err);
    return NextResponse.json(
      {
        scrollSpeedPxPerSec: TICKER_SPEED_DEFAULT_PPS,
        minPxPerSec: TICKER_SPEED_MIN_PPS,
        maxPxPerSec: TICKER_SPEED_MAX_PPS,
      },
      { status: 200 }
    );
  }
}

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as { role?: string }).role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await req.json();
  const raw = (body as { scrollSpeedPxPerSec?: unknown }).scrollSpeedPxPerSec;
  if (raw === undefined || raw === null) {
    return NextResponse.json(
      { error: "scrollSpeedPxPerSec is required" },
      { status: 400 }
    );
  }
  const scrollSpeedPxPerSec = clampTickerSpeedPxPerSec(Number(raw));
  try {
    await prisma.tickerSettings.upsert({
      where: { id: SETTINGS_ID },
      create: { id: SETTINGS_ID, scrollSpeedPxPerSec },
      update: { scrollSpeedPxPerSec },
    });
    return NextResponse.json({
      scrollSpeedPxPerSec,
      minPxPerSec: TICKER_SPEED_MIN_PPS,
      maxPxPerSec: TICKER_SPEED_MAX_PPS,
    });
  } catch (err) {
    console.error("ticker settings PATCH", err);
    return NextResponse.json(
      { error: "Could not save ticker settings. Ensure the database migration has been applied." },
      { status: 500 }
    );
  }
}
