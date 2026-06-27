import { NextResponse } from "next/server";
import { requireRealSuperAdmin } from "@/lib/session";
import {
  clearPreRestoreSnapshot,
  executeBackupSql,
  generateBackupSql,
  getPreRestoreSnapshot,
  isValidBackupSql,
  loadPreRestoreSnapshotSql,
  savePreRestoreSnapshot,
} from "@/lib/databaseBackup";

const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;

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

  const content = await generateBackupSql();
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");

  return new NextResponse(content, {
    status: 200,
    headers: {
      "Content-Type": "application/sql; charset=utf-8",
      "Content-Disposition": `attachment; filename="teamvoc-db-backup-${timestamp}.sql"`,
      "Cache-Control": "no-store",
    },
  });
}

export async function POST(req: Request) {
  const authError = await requireAdmin();
  if (authError) return authError;

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ error: "File too large (max 15MB)" }, { status: 400 });
  }

  const sql = await file.text();
  if (!isValidBackupSql(sql)) {
    return NextResponse.json(
      { error: "Invalid backup file. Please upload a file downloaded from this Admin page." },
      { status: 400 }
    );
  }

  try {
    const currentSql = await generateBackupSql();
    await savePreRestoreSnapshot(currentSql);
    await executeBackupSql(sql);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Restore failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
