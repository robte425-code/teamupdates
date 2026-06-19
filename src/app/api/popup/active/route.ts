import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getActivePopupMessage } from "@/lib/popupSettings";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const popup = await getActivePopupMessage();
  if (!popup) {
    return NextResponse.json(null);
  }
  return NextResponse.json({
    id: popup.id,
    title: popup.title,
    body: popup.body,
    updatedAt: popup.updatedAt.toISOString(),
  });
}
