import { NextResponse } from "next/server";
import { fetchNeonBackupStatus } from "@/lib/neonBackupStatus";
import { requireRealSuperAdmin } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET() {
  const admin = await requireRealSuperAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const data = await fetchNeonBackupStatus();
  return NextResponse.json(data);
}
