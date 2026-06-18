"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import type { ImpersonationStatus } from "@team/shell";

type Ctx = ImpersonationStatus & { loading: boolean; refresh: () => void };

const ImpersonationContext = createContext<Ctx | null>(null);

const empty: ImpersonationStatus = {
  canImpersonate: false,
  impersonating: false,
  real: { email: "", name: "" },
  effective: { email: "", name: "", role: "member" },
  target: null,
};

export function ImpersonationProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<ImpersonationStatus>(empty);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(() => {
    fetch("/api/impersonate", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : empty))
      .then((data: ImpersonationStatus) => setStatus(data))
      .catch(() => setStatus(empty))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <ImpersonationContext.Provider value={{ ...status, loading, refresh }}>
      {children}
    </ImpersonationContext.Provider>
  );
}

export function useImpersonation(): Ctx {
  const ctx = useContext(ImpersonationContext);
  if (!ctx) {
    return { ...empty, loading: false, refresh: () => {} };
  }
  return ctx;
}
