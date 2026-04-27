import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Client } from "pg";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const BACKUP_HEADER = "-- TEAMVOC_DB_BACKUP_V1";
const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;

function sqlString(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

function sqlValue(value: unknown): string {
  if (value === null || value === undefined) return "NULL";
  if (value instanceof Date) return sqlString(value.toISOString());
  if (typeof value === "string") return sqlString(value);
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "NULL";
  if (typeof value === "boolean") return value ? "TRUE" : "FALSE";
  return sqlString(JSON.stringify(value));
}

function insertStatement(table: string, columns: string[], rows: Record<string, unknown>[]): string[] {
  if (rows.length === 0) return [];
  return rows.map((row) => {
    const values = columns.map((c) => sqlValue(row[c])).join(", ");
    const cols = columns.map((c) => `"${c}"`).join(", ");
    return `INSERT INTO ${table} (${cols}) VALUES (${values});`;
  });
}

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const user = session.user as { role?: string } | undefined;
  if (user?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return null;
}

export async function GET() {
  const authError = await requireAdmin();
  if (authError) return authError;

  const [
    users,
    updates,
    keyDates,
    tickerSettings,
    tickerItems,
    birthdayEntries,
    pageVisits,
    phoneBookEntries,
  ] =
    await Promise.all([
      prisma.user.findMany({ orderBy: { createdAt: "asc" } }),
      prisma.update.findMany({ orderBy: { createdAt: "asc" } }),
      prisma.keyDate.findMany({ orderBy: { createdAt: "asc" } }),
      prisma.tickerSettings.findMany(),
      prisma.tickerItem.findMany({ orderBy: { createdAt: "asc" } }),
      prisma.birthdayEntry.findMany({ orderBy: [{ month: "asc" }, { day: "asc" }, { name: "asc" }] }),
      prisma.pageVisit.findMany({ orderBy: { visitedAt: "asc" } }),
      prisma.phoneBookEntry.findMany({ orderBy: { sortOrder: "asc" } }),
    ]);

  const lines: string[] = [
    BACKUP_HEADER,
    `-- generated_at_utc: ${new Date().toISOString()}`,
    "BEGIN;",
    'TRUNCATE TABLE public."PageVisit", public."PhoneBookEntry", public."BirthdayEntry", public."TickerItem", public."TickerSettings", public."KeyDate", public."Update", public."User" RESTART IDENTITY CASCADE;',
    ...insertStatement('public."User"', ["id", "email", "name", "password", "role", "createdAt"], users),
    ...insertStatement('public."Update"', ["id", "date", "title", "body", "archived", "createdAt"], updates),
    ...insertStatement(
      'public."KeyDate"',
      ["id", "dateType", "eventDate", "eventEndDate", "title", "body", "archived", "createdAt"],
      keyDates
    ),
    ...insertStatement(
      'public."TickerSettings"',
      ["id", "scrollSpeedPxPerSec"],
      tickerSettings.length
        ? tickerSettings
        : [{ id: "default", scrollSpeedPxPerSec: 40 }]
    ),
    ...insertStatement('public."TickerItem"', ["id", "text", "displayed", "createdAt"], tickerItems),
    ...insertStatement(
      'public."BirthdayEntry"',
      ["id", "name", "month", "day", "createdAt", "updatedAt"],
      birthdayEntries
    ),
    ...insertStatement(
      'public."PageVisit"',
      ["id", "userId", "userName", "userEmail", "path", "visitedAt"],
      pageVisits
    ),
    ...insertStatement(
      'public."PhoneBookEntry"',
      [
        "id",
        "sortOrder",
        "employee",
        "workCell",
        "fax",
        "extension",
        "personalEmail",
        "personalPhone",
        "remarks",
        "createdAt",
        "updatedAt",
      ],
      phoneBookEntries
    ),
    "COMMIT;",
    "",
  ];

  const content = lines.join("\n");
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
  if (!sql.includes(BACKUP_HEADER)) {
    return NextResponse.json(
      { error: "Invalid backup file. Please upload a file downloaded from this Admin page." },
      { status: 400 }
    );
  }

  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    return NextResponse.json({ error: "DATABASE_URL is not configured" }, { status: 500 });
  }

  const client = new Client({ connectionString: dbUrl });
  try {
    await client.connect();
    await client.query(sql);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Restore failed";
    return NextResponse.json({ error: message }, { status: 400 });
  } finally {
    await client.end().catch(() => undefined);
  }
}
