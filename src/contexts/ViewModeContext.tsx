"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";

const VIEW_MODE_KEY = "teamvoc-view-mode";

type ViewModeContextValue = {
  showAdminView: boolean;
  setShowAdminView: (value: boolean) => void;
};

const ViewModeContext = createContext<ViewModeContextValue | null>(null);

export function ViewModeProvider({ children }: { children: React.ReactNode }) {
  const [showAdminView, setShowAdminViewState] = useState(true);

  useEffect(() => {
    const stored = typeof window !== "undefined" ? localStorage.getItem(VIEW_MODE_KEY) : null;
    if (stored === "user") setShowAdminViewState(false);
    else if (stored === "admin") setShowAdminViewState(true);
  }, []);

  const setShowAdminView = useCallback((value: boolean) => {
    setShowAdminViewState(value);
    if (typeof window !== "undefined") {
      localStorage.setItem(VIEW_MODE_KEY, value ? "admin" : "user");
    }
  }, []);

  return (
    <ViewModeContext.Provider value={{ showAdminView, setShowAdminView }}>
      {children}
    </ViewModeContext.Provider>
  );
}

export function useViewMode(): ViewModeContextValue {
  const ctx = useContext(ViewModeContext);
  if (!ctx) {
    return {
      showAdminView: true,
      setShowAdminView: () => {},
    };
  }
  return ctx;
}
