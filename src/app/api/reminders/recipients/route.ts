import { NextResponse } from "next/server";
import { requireRealAdmin } from "@/lib/session";
import { prisma } from "@/lib/prisma";

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

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

  const rows = await prisma.reminderRecipient.findMany({
    orderBy: [{ enabled: "desc" }, { email: "asc" }],
  });
  return NextResponse.json(
    rows.map((r) => ({
      id: r.id,
      email: r.email,
      name: r.name,
      enabled: r.enabled,
      lastReminderSentAt: r.lastReminderSentAt?.toISOString() ?? null,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    }))
  );
}

export async function POST(req: Request) {
  const err = await requireAdmin();
  if (err) return err;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const b = body as { email?: unknown; name?: unknown; enabled?: unknown };
  if (typeof b.email !== "string" || !b.email.trim()) {
    return NextResponse.json({ error: "email is required" }, { status: 400 });
  }
  const email = normalizeEmail(b.email);
  const name =
    typeof b.name === "string" && b.name.trim() ? b.name.trim() : null;
  const enabled = b.enabled === false ? false : true;

  try {
    const row = await prisma.reminderRecipient.create({
      data: { email, name, enabled },
    });
    return NextResponse.json({
      id: row.id,
      email: row.email,
      name: row.name,
      enabled: row.enabled,
      lastReminderSentAt: row.lastReminderSentAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    });
  } catch (e) {
    console.error("reminder recipient POST", e);
    return NextResponse.json(
      { error: "Could not create recipient (duplicate email?)" },
      { status: 400 }
    );
  }
}
