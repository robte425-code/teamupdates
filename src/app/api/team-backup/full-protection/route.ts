import { NextResponse } from "next/server";
import { runFullProtectionRun } from "@/lib/fullProtectionRun";
import { requireRealAdmin } from "@/lib/session";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST() {
  const admin = await requireRealAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const result = await runFullProtectionRun();
  return NextResponse.json(result);
}
