"use client";

import { useSession } from "next-auth/react";
import { useImpersonation } from "@/contexts/ImpersonationContext";

/** True when the signed-in admin should see manage/edit UI on the home page. */
export function useShowAdminUI(): boolean {
  const { data: session } = useSession();
  const { impersonating } = useImpersonation();
  const isAdmin = (session?.user as { role?: string } | undefined)?.role === "admin";
  return isAdmin && !impersonating;
}
