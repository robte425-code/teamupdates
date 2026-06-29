import { NextResponse } from "next/server";
import { requireAuth, requireRealAdmin } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import {
  UPDATE_BADGE_DAYS_DEFAULT,
  UPDATE_BADGE_MAX_DAYS,
  UPDATE_BADGE_SETTINGS_ID,
  clampUpdateBadgeDays,
} from "@/lib/updateBadgeSettings";

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
  const user = await requireAuth();
  if (!user) {
    return jsonNoStore({ error: "Unauthorized" }, 401);
  }
  try {
    const row = await prisma.updateBadgeSettings.findUnique({
      where: { id: UPDATE_BADGE_SETTINGS_ID },
    });
    return jsonNoStore({
      updatedBadgeDays: clampUpdateBadgeDays(
        row?.updatedBadgeDays ?? UPDATE_BADGE_DAYS_DEFAULT,
        UPDATE_BADGE_DAYS_DEFAULT
      ),
      maxDays: UPDATE_BADGE_MAX_DAYS,
    });
  } catch (err) {
    console.error("update badge settings GET", err);
    return jsonNoStore({ error: "Could not load badge settings from the database." }, 500);
  }
}

export async function PATCH(req: Request) {
  const admin = await requireRealAdmin();
  if (!admin) {
    return jsonNoStore({ error: "Forbidden" }, 403);
  }
  const body = (await req.json()) as { updatedBadgeDays?: unknown };
  if (body.updatedBadgeDays === undefined) {
    return jsonNoStore({ error: "Provide updatedBadgeDays" }, 400);
  }

  let existing: { updatedBadgeDays: number } | null = null;
  try {
    existing = await prisma.updateBadgeSettings.findUnique({
      where: { id: UPDATE_BADGE_SETTINGS_ID },
    });
  } catch {
    existing = null;
  }

  const base = existing?.updatedBadgeDays ?? UPDATE_BADGE_DAYS_DEFAULT;
  const next = clampUpdateBadgeDays(body.updatedBadgeDays, base);

  try {
    await prisma.updateBadgeSettings.upsert({
      where: { id: UPDATE_BADGE_SETTINGS_ID },
      create: { id: UPDATE_BADGE_SETTINGS_ID, updatedBadgeDays: next },
      update: { updatedBadgeDays: next },
    });
    const row = await prisma.updateBadgeSettings.findUnique({
      where: { id: UPDATE_BADGE_SETTINGS_ID },
    });
    return jsonNoStore({
      updatedBadgeDays: clampUpdateBadgeDays(
        row?.updatedBadgeDays ?? next,
        UPDATE_BADGE_DAYS_DEFAULT
      ),
      maxDays: UPDATE_BADGE_MAX_DAYS,
    });
  } catch (err) {
    console.error("update badge settings PATCH", err);
    return jsonNoStore(
      { error: "Could not save settings. Ensure the database migration has been applied." },
      500
    );
  }
}
