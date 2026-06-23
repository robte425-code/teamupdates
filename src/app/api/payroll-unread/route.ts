import { NextResponse } from "next/server";
import { fetchPayrollUnreadForEmail } from "@team/shell/payroll-unread-server";
import { getEffectiveSessionUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getEffectiveSessionUser();
  if (!user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const status = await fetchPayrollUnreadForEmail(user.email);
  return NextResponse.json(status);
}
