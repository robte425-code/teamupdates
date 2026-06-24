import { NextResponse } from "next/server";
import { requireRealAdmin } from "@/lib/session";
import {
  clearPreRestoreSnapshot,
  executeBackupSql,
  getPreRestoreSnapshot,
  isValidBackupSql,
  loadPreRestoreSnapshotSql,
} from "@/lib/databaseBackup";

async function requireAdmin() {
  const admin = await requireRealAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return null;
}

export async function GET() {
  const authError = await requireAdmin();
  if (authError) return authError;

  const snapshot = await getPreRestoreSnapshot();
  return NextResponse.json({
    available: Boolean(snapshot),
    createdAt: snapshot?.createdAt.toISOString() ?? null,
  });
}

export async function POST() {
  const authError = await requireAdmin();
  if (authError) return authError;

  const sql = await loadPreRestoreSnapshotSql();
  if (!sql || !isValidBackupSql(sql)) {
    return NextResponse.json(
      { error: "No reverse-restore snapshot is available. Restore a backup first." },
      { status: 404 }
    );
  }

  try {
    await executeBackupSql(sql);
    await clearPreRestoreSnapshot();
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Reverse restore failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
