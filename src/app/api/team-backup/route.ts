import { NextResponse } from "next/server";
import { requireRealSuperAdmin } from "@/lib/session";
import { listTeamBackups, runTeamBackup } from "@/lib/team-backup-hub";
import type { TeamBackupAppId } from "@/lib/teamBackupApps";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

async function requireAdmin() {
  const admin = await requireRealSuperAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return null;
}

export async function GET() {
  const authError = await requireAdmin();
  if (authError) return authError;

  const data = await listTeamBackups();
  return NextResponse.json(data);
}

export async function POST(req: Request) {
  const authError = await requireAdmin();
  if (authError) return authError;

  const body = (await req.json().catch(() => ({}))) as { apps?: TeamBackupAppId[] };
  const apps = Array.isArray(body.apps) ? body.apps : undefined;
  const data = await runTeamBackup(apps);
  return NextResponse.json(data);
}
