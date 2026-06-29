import { Client } from "pg";
import { prisma } from "@/lib/prisma";

export const BACKUP_HEADER = "-- TEAMVOC_DB_BACKUP_V1";
export const PRE_RESTORE_SNAPSHOT_ID = "latest";

const DATA_TABLES_TRUNCATE =
  'public."PageVisit", public."PhoneBookEntry", public."BirthdayEntry", public."ReminderRecipient", public."ReminderSettings", public."TickerItem", public."TickerSettings", public."UpdateBadgeSettings", public."KeyDateBadgeSettings", public."KeyDate", public."Update", public."PopupDismissal", public."PopupSettings", public."PopupMessage", public."User"';

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

export function isValidBackupSql(sql: string): boolean {
  return sql.includes(BACKUP_HEADER);
}

export async function generateBackupSql(): Promise<string> {
  const [
    users,
    updates,
    keyDates,
    keyDateBadgeSettings,
    updateBadgeSettings,
    tickerSettings,
    tickerItems,
    birthdayEntries,
    reminderSettings,
    reminderRecipients,
    pageVisits,
    phoneBookEntries,
    popupMessages,
    popupSettings,
    popupDismissals,
  ] = await Promise.all([
    prisma.user.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.update.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.keyDate.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.keyDateBadgeSettings.findMany(),
    prisma.updateBadgeSettings.findMany(),
    prisma.tickerSettings.findMany(),
    prisma.tickerItem.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.birthdayEntry.findMany({ orderBy: [{ month: "asc" }, { day: "asc" }, { name: "asc" }] }),
    prisma.reminderSettings.findMany(),
    prisma.reminderRecipient.findMany({ orderBy: { email: "asc" } }),
    prisma.pageVisit.findMany({ orderBy: { visitedAt: "asc" } }),
    prisma.phoneBookEntry.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.popupMessage.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.popupSettings.findMany(),
    prisma.popupDismissal.findMany({ orderBy: { dismissedAt: "asc" } }),
  ]);

  const lines: string[] = [
    BACKUP_HEADER,
    `-- generated_at_utc: ${new Date().toISOString()}`,
    "BEGIN;",
    `TRUNCATE TABLE ${DATA_TABLES_TRUNCATE} RESTART IDENTITY CASCADE;`,
    ...insertStatement('public."User"', ["id", "email", "name", "password", "role", "createdAt"], users),
    ...insertStatement(
      'public."Update"',
      [
        "id",
        "date",
        "title",
        "body",
        "archived",
        "createdAt",
        "createdByName",
        "createdByEmail",
        "contentUpdatedAt",
        "updatedByName",
        "updatedByEmail",
      ],
      updates
    ),
    ...insertStatement(
      'public."KeyDate"',
      [
        "id",
        "dateType",
        "eventDate",
        "eventEndDate",
        "title",
        "body",
        "archived",
        "createdAt",
        "createdByName",
        "createdByEmail",
      ],
      keyDates
    ),
    ...insertStatement(
      'public."UpdateBadgeSettings"',
      ["id", "updatedBadgeDays"],
      updateBadgeSettings.length
        ? updateBadgeSettings
        : [{ id: "default", updatedBadgeDays: 4 }]
    ),
    ...insertStatement(
      'public."KeyDateBadgeSettings"',
      ["id", "newBadgeDays", "soonBadgeDays"],
      keyDateBadgeSettings.length
        ? keyDateBadgeSettings
        : [{ id: "default", newBadgeDays: 3, soonBadgeDays: 7 }]
    ),
    ...insertStatement(
      'public."TickerSettings"',
      ["id", "scrollSpeedPxPerSec"],
      tickerSettings.length ? tickerSettings : [{ id: "default", scrollSpeedPxPerSec: 40 }]
    ),
    ...insertStatement('public."TickerItem"', ["id", "text", "displayed", "createdAt"], tickerItems),
    ...insertStatement(
      'public."BirthdayEntry"',
      ["id", "name", "month", "day", "createdAt", "updatedAt"],
      birthdayEntries
    ),
    ...insertStatement(
      'public."ReminderSettings"',
      ["id", "inactiveDaysThreshold", "emailSubject", "emailBody"],
      reminderSettings.length
        ? reminderSettings
        : [
            {
              id: "default",
              inactiveDaysThreshold: 7,
              emailSubject: "Reminder: TEAM dashboard",
              emailBody:
                "Hi {{firstName}},\n\nWe have not seen you on the TEAM dashboard for {{inactiveDays}} days.\n\nPlease visit: {{dashboardUrl}}\n\nThank you.",
            },
          ]
    ),
    ...insertStatement(
      'public."ReminderRecipient"',
      ["id", "email", "name", "enabled", "lastReminderSentAt", "createdAt", "updatedAt"],
      reminderRecipients
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
        "isEmployee",
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
    ...insertStatement(
      'public."PopupMessage"',
      ["id", "title", "body", "createdAt", "updatedAt", "createdByName", "createdByEmail"],
      popupMessages
    ),
    ...insertStatement('public."PopupSettings"', ["id", "activePopupId"], popupSettings),
    ...insertStatement(
      'public."PopupDismissal"',
      ["id", "userEmail", "popupMessageId", "popupUpdatedAt", "dismissedAt"],
      popupDismissals
    ),
    "COMMIT;",
    "",
  ];

  return lines.join("\n");
}

export async function executeBackupSql(sql: string): Promise<void> {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    throw new Error("DATABASE_URL is not configured");
  }

  const client = new Client({ connectionString: dbUrl });
  try {
    await client.connect();
    await client.query(sql);
  } finally {
    await client.end().catch(() => undefined);
  }
}

export async function savePreRestoreSnapshot(sql: string): Promise<void> {
  await prisma.databasePreRestoreSnapshot.upsert({
    where: { id: PRE_RESTORE_SNAPSHOT_ID },
    create: { id: PRE_RESTORE_SNAPSHOT_ID, sql },
    update: { sql, createdAt: new Date() },
  });
}

export async function getPreRestoreSnapshot(): Promise<{ createdAt: Date } | null> {
  const row = await prisma.databasePreRestoreSnapshot.findUnique({
    where: { id: PRE_RESTORE_SNAPSHOT_ID },
    select: { createdAt: true, sql: true },
  });
  if (!row?.sql) return null;
  return { createdAt: row.createdAt };
}

export async function loadPreRestoreSnapshotSql(): Promise<string | null> {
  const row = await prisma.databasePreRestoreSnapshot.findUnique({
    where: { id: PRE_RESTORE_SNAPSHOT_ID },
    select: { sql: true },
  });
  return row?.sql ?? null;
}

export async function clearPreRestoreSnapshot(): Promise<void> {
  await prisma.databasePreRestoreSnapshot.deleteMany({
    where: { id: PRE_RESTORE_SNAPSHOT_ID },
  });
}
