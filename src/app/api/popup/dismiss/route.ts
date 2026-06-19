import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getActivePopupMessage, recordPopupDismissal } from "@/lib/popupSettings";

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userEmail = (session.user as { email?: string | null }).email;
  if (!userEmail) {
    return NextResponse.json({ error: "User email required" }, { status: 400 });
  }

  const popup = await getActivePopupMessage();
  if (!popup) {
    return NextResponse.json({ error: "No active popup" }, { status: 404 });
  }

  await recordPopupDismissal(userEmail, popup.id, popup.updatedAt);
  return NextResponse.json({ ok: true });
}
