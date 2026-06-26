import { NextRequest, NextResponse } from "next/server";
import { listAdminEmails, replaceAdminsList } from "@/lib/admins";
import { requireInternalAccess } from "@/lib/internal-access";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const authError = requireInternalAccess(req);
  if (authError) {
    return NextResponse.json({ error: authError }, { status: authError === "Forbidden" ? 403 : 503 });
  }
  const admins = await listAdminEmails();
  return NextResponse.json({ admins });
}

export async function PUT(req: NextRequest) {
  const authError = requireInternalAccess(req);
  if (authError) {
    return NextResponse.json({ error: authError }, { status: authError === "Forbidden" ? 403 : 503 });
  }
  const body = (await req.json().catch(() => ({}))) as { admins?: string[] };
  if (!Array.isArray(body.admins)) {
    return NextResponse.json({ error: "admins array required" }, { status: 400 });
  }
  await replaceAdminsList(body.admins);
  return NextResponse.json({ admins: await listAdminEmails() });
}
