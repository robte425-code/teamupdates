import { NextResponse } from "next/server";
import {
  executeBackupSql,
  generateBackupSql,
  isValidBackupSql,
} from "@/lib/databaseBackup";
import {
  downloadSharePointBackup,
  isSharePointConfigured,
  uploadSharePointBackup,
} from "@/lib/sharepointBackups";
import { buildBackupFilename, getTeamBackupApp } from "@/lib/teamBackupApps";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const MAX_RESTORE_BYTES = 15 * 1024 * 1024;

function verifyInternalAccess(req: Request): boolean {
  const secret = process.env.TEAM_INTERNAL_ACCESS_SECRET?.trim();
  if (!secret) return false;
  const auth = req.headers.get("authorization") ?? "";
  return auth === `Bearer ${secret}`;
}

export async function GET(req: Request) {
  if (!verifyInternalAccess(req)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const target = searchParams.get("target");

  try {
    const app = getTeamBackupApp("dashboard");
    const sql = await generateBackupSql();
    const filename = buildBackupFilename(app);

    if (target === "sharepoint") {
      if (!isSharePointConfigured()) {
        return NextResponse.json(
          { error: "SHAREPOINT_SITE_URL is not configured on Dashboard" },
          { status: 500 }
        );
      }

      const uploaded = await uploadSharePointBackup(
        filename,
        Buffer.from(sql, "utf8"),
        app.contentType
      );
      return NextResponse.json({
        ok: true,
        filename: uploaded.name,
        size: uploaded.size,
        id: uploaded.id,
        webUrl: uploaded.webUrl,
      });
    }

    return new NextResponse(sql, {
      status: 200,
      headers: {
        "Content-Type": app.contentType,
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Backup failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  if (!verifyInternalAccess(req)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const contentType = req.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    const body = (await req.json()) as { source?: string; backupId?: string };
    if (body.source === "sharepoint") {
      if (!isSharePointConfigured()) {
        return NextResponse.json(
          { error: "SHAREPOINT_SITE_URL is not configured on Dashboard" },
          { status: 500 }
        );
      }
      if (!body.backupId) {
        return NextResponse.json({ error: "backupId is required" }, { status: 400 });
      }

      try {
        const downloaded = await downloadSharePointBackup(body.backupId);
        const sql = downloaded.content.toString("utf8");
        if (!isValidBackupSql(sql)) {
          return NextResponse.json({ error: "Invalid Dashboard backup file." }, { status: 400 });
        }
        await executeBackupSql(sql);
        return NextResponse.json({ ok: true, filename: downloaded.name });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Restore failed";
        return NextResponse.json({ error: message }, { status: 400 });
      }
    }
  }

  const contentLength = Number(req.headers.get("content-length") ?? "0");
  if (contentLength > MAX_RESTORE_BYTES) {
    return NextResponse.json({ error: "Backup file too large (max 15MB)" }, { status: 400 });
  }

  try {
    const sql = await req.text();
    if (!isValidBackupSql(sql)) {
      return NextResponse.json(
        { error: "Invalid Dashboard backup file." },
        { status: 400 }
      );
    }
    await executeBackupSql(sql);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Restore failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
