import { withAuth } from "next-auth/middleware";

export default withAuth({
  callbacks: {
    authorized: ({ token }) => !!token,
  },
});

export const config = {
  matcher: [
    "/",
    "/archived-updates",
    "/manage",
    "/manage/updates",
    "/manage/key-dates",
    "/manage/archived-key-dates",
    "/phone-book",
  ],
};
