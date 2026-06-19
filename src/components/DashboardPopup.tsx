"use client";

import { useEffect, useState } from "react";
import { PopupMessageBody } from "./PopupMessageBody";

type ActivePopup = {
  id: string;
  title: string;
  body: string;
  updatedAt: string;
};

export function DashboardPopup() {
  const [popup, setPopup] = useState<ActivePopup | null>(null);
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/popup/active", { cache: "no-store" })
      .then(async (r) => {
        if (!r.ok) return null;
        return r.json();
      })
      .then((data) => {
        if (cancelled) return;
        if (data && data.id && data.title) {
          setPopup(data as ActivePopup);
          setVisible(true);
        } else {
          setPopup(null);
          setVisible(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setPopup(null);
          setVisible(false);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading || !visible || !popup) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="dashboard-popup-title"
    >
      <div className="flex max-h-[min(85vh,32rem)] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-stone-200 bg-white shadow-xl">
        <div className="border-b border-stone-100 px-5 py-4">
          <h2 id="dashboard-popup-title" className="text-lg font-semibold text-stone-900">
            {popup.title}
          </h2>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <PopupMessageBody html={popup.body} />
        </div>
        <div className="border-t border-stone-100 bg-stone-50 px-5 py-4">
          <button
            type="button"
            onClick={() => setVisible(false)}
            className="w-full rounded-lg bg-stone-800 px-4 py-2.5 text-sm font-medium text-white hover:bg-stone-700"
          >
            Ok
          </button>
        </div>
      </div>
    </div>
  );
}
