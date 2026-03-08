"use client";

import { SessionProvider } from "next-auth/react";
import { ViewModeProvider } from "@/contexts/ViewModeContext";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ViewModeProvider>{children}</ViewModeProvider>
    </SessionProvider>
  );
}
