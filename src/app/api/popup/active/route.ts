import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getActivePopupMessage, hasUserDismissedPopup } from "@/lib/popupSettings";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const popup = await getActivePopupMessage();
  if (!popup) {
    return NextResponse.json(null);
  }

  const userEmail = (session.user as { email?: string | null }).email;
  if (
    userEmail &&
    (await hasUserDismissedPopup(userEmail, popup.id, popup.updatedAt))
  ) {
    return NextResponse.json(null);
  }

  return NextResponse.json({
    id: popup.id,
    title: popup.title,
    body: popup.body,
    updatedAt: popup.updatedAt.toISOString(),
  });
}
