import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  KEY_DATE_BADGE_MAX_DAYS,
  KEY_DATE_BADGE_NEW_DEFAULT,
  KEY_DATE_BADGE_SETTINGS_ID,
  KEY_DATE_BADGE_SOON_DEFAULT,
  clampKeyDateBadgeDays,
} from "@/lib/keyDateBadgeSettings";

/** Never cache: values must match DB across devices and after admin edits. */
export const dynamic = "force-dynamic";
export const revalidate = 0;

const NO_STORE_HEADERS = {
  "Cache-Control": "private, no-store, max-age=0, must-revalidate",
  Pragma: "no-cache",
  Expires: "0",
  Vary: "Cookie",
} as const;

function jsonNoStore(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: NO_STORE_HEADERS });
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return jsonNoStore({ error: "Unauthorized" }, 401);
  }
  try {
    const row = await prisma.keyDateBadgeSettings.findUnique({
      where: { id: KEY_DATE_BADGE_SETTINGS_ID },
    });
    return jsonNoStore({
      newBadgeDays: clampKeyDateBadgeDays(
        row?.newBadgeDays ?? KEY_DATE_BADGE_NEW_DEFAULT,
        KEY_DATE_BADGE_NEW_DEFAULT
      ),
      soonBadgeDays: clampKeyDateBadgeDays(
        row?.soonBadgeDays ?? KEY_DATE_BADGE_SOON_DEFAULT,
        KEY_DATE_BADGE_SOON_DEFAULT
      ),
      maxDays: KEY_DATE_BADGE_MAX_DAYS,
    });
  } catch (err) {
    console.error("key date badge settings GET", err);
    return jsonNoStore(
      { error: "Could not load badge settings from the database." },
      500
    );
  }
}

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as { role?: string }).role !== "admin") {
    return jsonNoStore({ error: "Forbidden" }, 403);
  }
  const body = (await req.json()) as {
    newBadgeDays?: unknown;
    soonBadgeDays?: unknown;
  };
  if (body.newBadgeDays === undefined && body.soonBadgeDays === undefined) {
    return jsonNoStore({ error: "Provide newBadgeDays and/or soonBadgeDays" }, 400);
  }

  let existing: { newBadgeDays: number; soonBadgeDays: number } | null = null;
  try {
    existing = await prisma.keyDateBadgeSettings.findUnique({
      where: { id: KEY_DATE_BADGE_SETTINGS_ID },
    });
  } catch {
    existing = null;
  }

  const baseNew = existing?.newBadgeDays ?? KEY_DATE_BADGE_NEW_DEFAULT;
  const baseSoon = existing?.soonBadgeDays ?? KEY_DATE_BADGE_SOON_DEFAULT;
  const nextNew = clampKeyDateBadgeDays(
    body.newBadgeDays !== undefined ? body.newBadgeDays : baseNew,
    KEY_DATE_BADGE_NEW_DEFAULT
  );
  const nextSoon = clampKeyDateBadgeDays(
    body.soonBadgeDays !== undefined ? body.soonBadgeDays : baseSoon,
    KEY_DATE_BADGE_SOON_DEFAULT
  );

  try {
    await prisma.keyDateBadgeSettings.upsert({
      where: { id: KEY_DATE_BADGE_SETTINGS_ID },
      create: {
        id: KEY_DATE_BADGE_SETTINGS_ID,
        newBadgeDays: nextNew,
        soonBadgeDays: nextSoon,
      },
      update: {
        newBadgeDays: nextNew,
        soonBadgeDays: nextSoon,
      },
    });
    const row = await prisma.keyDateBadgeSettings.findUnique({
      where: { id: KEY_DATE_BADGE_SETTINGS_ID },
    });
    return jsonNoStore({
      newBadgeDays: clampKeyDateBadgeDays(
        row?.newBadgeDays ?? nextNew,
        KEY_DATE_BADGE_NEW_DEFAULT
      ),
      soonBadgeDays: clampKeyDateBadgeDays(
        row?.soonBadgeDays ?? nextSoon,
        KEY_DATE_BADGE_SOON_DEFAULT
      ),
      maxDays: KEY_DATE_BADGE_MAX_DAYS,
    });
  } catch (err) {
    console.error("key date badge settings PATCH", err);
    return jsonNoStore(
      { error: "Could not save settings. Ensure the database migration has been applied." },
      500
    );
  }
}
