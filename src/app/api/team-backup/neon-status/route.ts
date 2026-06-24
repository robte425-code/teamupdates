import { NextResponse } from "next/server";
import { fetchNeonBackupStatus } from "@/lib/neonBackupStatus";
import { requireRealAdmin } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET() {
  const admin = await requireRealAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const data = await fetchNeonBackupStatus();
  return NextResponse.json(data);
}
