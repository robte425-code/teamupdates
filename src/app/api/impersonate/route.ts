import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  clearImpersonateCookieOptions,
  impersonateCookieOptions,
} from "@/lib/impersonation";
import { getImpersonationContext, getRealSessionUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET() {
  const ctx = await getImpersonationContext();
  return NextResponse.json(ctx);
}

export async function POST(req: NextRequest) {
  const real = await getRealSessionUser();
  if (!real || real.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await req.json().catch(() => ({}));
  const email = String(body?.email || "")
    .trim()
    .toLowerCase();
  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "A valid email is required" }, { status: 400 });
  }
  if (email === real.email.toLowerCase()) {
    return NextResponse.json({ error: "That's already you" }, { status: 400 });
  }
  cookies().set(impersonateCookieOptions(email));
  return NextResponse.json({ ok: true, email });
}

export async function DELETE() {
  const real = await getRealSessionUser();
  if (!real) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  cookies().set(clearImpersonateCookieOptions());
  return NextResponse.json({ ok: true });
}
