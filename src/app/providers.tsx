"use client";

import { SessionProvider } from "next-auth/react";
import { ImpersonationProvider } from "@/contexts/ImpersonationContext";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ImpersonationProvider>{children}</ImpersonationProvider>
    </SessionProvider>
  );
}
