import { NextResponse } from "next/server";
import { requireRealAdmin } from "@/lib/session";
import { prisma } from "@/lib/prisma";

const SETTINGS_ID = "default";
const MIN_THRESHOLD = 1;
const MAX_THRESHOLD = 365;

async function requireAdmin() {
  const admin = await requireRealAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return null;
}

export async function GET() {
  const err = await requireAdmin();
  if (err) return err;

  const row = await prisma.reminderSettings.findUnique({
    where: { id: SETTINGS_ID },
  });
  if (!row) {
    return NextResponse.json(
      { error: "Reminder settings missing. Run database migrations." },
      { status: 500 }
    );
  }
  return NextResponse.json({
    inactiveDaysThreshold: row.inactiveDaysThreshold,
    emailSubject: row.emailSubject,
    emailBody: row.emailBody,
    templatePlaceholders: ["{{firstName}}", "{{name}}", "{{email}}", "{{inactiveDays}}", "{{dashboardUrl}}"],
  });
}

export async function PATCH(req: Request) {
  const err = await requireAdmin();
  if (err) return err;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const b = body as {
    inactiveDaysThreshold?: unknown;
    emailSubject?: unknown;
    emailBody?: unknown;
  };

  const data: {
    inactiveDaysThreshold?: number;
    emailSubject?: string;
    emailBody?: string;
  } = {};

  if (b.inactiveDaysThreshold !== undefined) {
    const n = Number(b.inactiveDaysThreshold);
    if (!Number.isFinite(n) || n < MIN_THRESHOLD || n > MAX_THRESHOLD) {
      return NextResponse.json(
        { error: `inactiveDaysThreshold must be between ${MIN_THRESHOLD} and ${MAX_THRESHOLD}` },
        { status: 400 }
      );
    }
    data.inactiveDaysThreshold = Math.round(n);
  }
  if (b.emailSubject !== undefined) {
    if (typeof b.emailSubject !== "string" || !b.emailSubject.trim()) {
      return NextResponse.json({ error: "emailSubject must be a non-empty string" }, { status: 400 });
    }
    data.emailSubject = b.emailSubject.trim();
  }
  if (b.emailBody !== undefined) {
    if (typeof b.emailBody !== "string" || !b.emailBody.trim()) {
      return NextResponse.json({ error: "emailBody must be a non-empty string" }, { status: 400 });
    }
    data.emailBody = b.emailBody.trim();
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  try {
    const row = await prisma.reminderSettings.update({
      where: { id: SETTINGS_ID },
      data,
    });
    return NextResponse.json({
      inactiveDaysThreshold: row.inactiveDaysThreshold,
      emailSubject: row.emailSubject,
      emailBody: row.emailBody,
      templatePlaceholders: ["{{firstName}}", "{{name}}", "{{email}}", "{{inactiveDays}}", "{{dashboardUrl}}"],
    });
  } catch (e) {
    console.error("reminder settings PATCH", e);
    return NextResponse.json(
      { error: "Could not save reminder settings. Ensure migrations are applied." },
      { status: 500 }
    );
  }
}
