import { NextResponse } from "next/server";
import { requireRealAdmin } from "@/lib/session";
import { runTeamRestore } from "@/lib/team-backup-hub";
import type { TeamBackupAppId } from "@/lib/teamBackupApps";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

async function requireAdmin() {
  const admin = await requireRealAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return null;
}

export async function POST(req: Request) {
  const authError = await requireAdmin();
  if (authError) return authError;

  const body = (await req.json().catch(() => ({}))) as {
    app?: TeamBackupAppId;
    backupId?: string;
  };

  if (!body.app || !body.backupId) {
    return NextResponse.json({ error: "app and backupId are required" }, { status: 400 });
  }

  const result = await runTeamRestore(body.app, body.backupId);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
