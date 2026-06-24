import { NextResponse } from "next/server";
import { createAppNeonSnapshot } from "@/lib/neonBackupStatus";
import { isNeonApiConfigured } from "@/lib/neonApi";
import { requireRealAdmin } from "@/lib/session";
import type { TeamBackupAppId } from "@/lib/teamBackupApps";

export const dynamic = "force-dynamic";

const APP_IDS = new Set<TeamBackupAppId>(["dashboard", "requests", "voc", "payroll", "hr"]);

export async function POST(req: Request) {
  const admin = await requireRealAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!isNeonApiConfigured()) {
    return NextResponse.json({ error: "NEON_API_KEY is not configured." }, { status: 503 });
  }

  const body = (await req.json().catch(() => ({}))) as { app?: string };
  if (!body.app || !APP_IDS.has(body.app as TeamBackupAppId)) {
    return NextResponse.json({ error: "app is required" }, { status: 400 });
  }

  try {
    const result = await createAppNeonSnapshot(body.app as TeamBackupAppId);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Snapshot failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
