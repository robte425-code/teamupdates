import { NextResponse } from "next/server";
import { runFullProtectionRun } from "@/lib/fullProtectionRun";
import { requireRealSuperAdmin } from "@/lib/session";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST() {
  const admin = await requireRealSuperAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const result = await runFullProtectionRun();
  return NextResponse.json(result);
}
