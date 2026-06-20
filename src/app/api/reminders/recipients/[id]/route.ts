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

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const err = await requireAdmin();
  if (err) return err;
  const { id } = await ctx.params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const b = body as { email?: unknown; name?: unknown; enabled?: unknown };

  const data: { email?: string; name?: string | null; enabled?: boolean } = {};
  if (b.email !== undefined) {
    if (typeof b.email !== "string" || !b.email.trim()) {
      return NextResponse.json({ error: "email must be non-empty" }, { status: 400 });
    }
    data.email = normalizeEmail(b.email);
  }
  if (b.name !== undefined) {
    data.name =
      typeof b.name === "string" && b.name.trim() ? b.name.trim() : null;
  }
  if (b.enabled !== undefined) {
    data.enabled = Boolean(b.enabled);
  }
  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  try {
    const row = await prisma.reminderRecipient.update({
      where: { id },
      data,
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
  } catch {
    return NextResponse.json(
      { error: "Could not update recipient (not found or duplicate email)" },
      { status: 400 }
    );
  }
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const err = await requireAdmin();
  if (err) return err;
  const { id } = await ctx.params;
  try {
    await prisma.reminderRecipient.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Recipient not found" }, { status: 404 });
  }
}
