import { cookies } from "next/headers";
import {
  IMPERSONATE_COOKIE,
  IMPERSONATE_MAX_AGE_SECONDS,
} from "@team/shell/impersonation";

export { IMPERSONATE_COOKIE, IMPERSONATE_MAX_AGE_SECONDS };

export function readImpersonateEmail(): string | null {
  const v = cookies().get(IMPERSONATE_COOKIE)?.value?.trim().toLowerCase();
  return v && v.includes("@") ? v : null;
}

export function impersonateCookieOptions(email: string) {
  return {
    name: IMPERSONATE_COOKIE,
    value: email.toLowerCase(),
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    maxAge: IMPERSONATE_MAX_AGE_SECONDS,
    secure: process.env.NODE_ENV === "production",
  };
}

export function clearImpersonateCookieOptions() {
  return {
    name: IMPERSONATE_COOKIE,
    value: "",
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    maxAge: 0,
    secure: process.env.NODE_ENV === "production",
  };
}
