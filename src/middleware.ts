import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { IMPERSONATE_COOKIE } from "@team/shell/impersonation";

export default withAuth(
  function middleware(req: NextRequest) {
    const path = req.nextUrl.pathname;
    if (path.startsWith("/manage") && req.cookies.get(IMPERSONATE_COOKIE)?.value) {
      return NextResponse.redirect(new URL("/", req.url));
    }
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
);

export const config = {
  matcher: [
    "/",
    "/archived-updates",
    "/manage",
    "/manage/updates",
    "/manage/key-dates",
    "/manage/archived-key-dates",
    "/manage/:path*",
    "/phone-book",
  ],
};
