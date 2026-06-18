"use client";

import { useSession } from "next-auth/react";
import { readAdminViewPreference } from "@team/shell";
import { useEffect, useState } from "react";
import { useImpersonation } from "@/contexts/ImpersonationContext";

/** True when the signed-in admin should see manage/edit UI on the home page. */
export function useShowAdminUI(): boolean {
  const { data: session } = useSession();
  const { impersonating } = useImpersonation();
  const [showAdminView, setShowAdminView] = useState(true);

  useEffect(() => {
    setShowAdminView(readAdminViewPreference());
  }, []);

  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key === "teamvoc-admin-view") {
        setShowAdminView(readAdminViewPreference());
      }
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const isAdmin = (session?.user as { role?: string } | undefined)?.role === "admin";
  return isAdmin && showAdminView && !impersonating;
}
