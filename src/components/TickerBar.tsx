"use client";

import { useEffect, useState } from "react";

type TickerItem = {
  id: string;
  text: string;
};

export function TickerBar() {
  const [items, setItems] = useState<TickerItem[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/ticker")
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        if (!cancelled && Array.isArray(data)) {
          setItems(data);
        }
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!items.length) return null;

  // Repeat items enough times so that even with only a few entries,
  // the ticker track stays visually full and continuous.
  const repeats = Math.max(4, 8 - items.length);
  const trackItems = Array.from({ length: repeats }, () => items).flat();

  return (
    <div className="border-b border-amber-200/70 bg-amber-50/90 text-amber-900">
      <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-2 text-xs sm:text-sm">
        <span className="shrink-0 rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white sm:text-[11px]">
          Ticker
        </span>
        <div className="relative flex-1 overflow-hidden">
          <div className="flex animate-ticker-1 whitespace-nowrap">
            {trackItems.map((item, idx) => (
              <span
                key={`t1-${item.id}-${idx}`}
                className="mr-8 inline-flex items-center gap-2"
              >
                <span className="inline-block h-1 w-1 rounded-full bg-amber-500" />
                <span>{item.text}</span>
              </span>
            ))}
          </div>
          <div className="pointer-events-none absolute inset-0 flex animate-ticker-2 whitespace-nowrap">
            {trackItems.map((item, idx) => (
              <span
                key={`t2-${item.id}-${idx}`}
                className="mr-8 inline-flex items-center gap-2"
              >
                <span className="inline-block h-1 w-1 rounded-full bg-amber-500" />
                <span>{item.text}</span>
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

