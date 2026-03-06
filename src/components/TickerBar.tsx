"use client";

import { useEffect, useRef, useState } from "react";

type TickerItem = {
  id: string;
  text: string;
};

export function TickerBar() {
  const [items, setItems] = useState<TickerItem[]>([]);
  const trackRef = useRef<HTMLDivElement | null>(null);

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

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    let width = el.scrollWidth / 2 || 1;
    let offset = 0;
    let last = performance.now();
    let frame: number;
    const speed = 40; // px per second

    const step = (now: number) => {
      const dt = now - last;
      last = now;
      offset -= (speed * dt) / 1000;
      if (-offset >= width) {
        offset += width;
      }
      el.style.transform = `translateX(${offset}px)`;
      frame = requestAnimationFrame(step);
    };

    frame = requestAnimationFrame(step);

    const handleResize = () => {
      width = el.scrollWidth / 2 || 1;
    };
    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", handleResize);
    };
  }, [items]);

  if (!items.length) return null;

  const trackItems = [...items, ...items];

  return (
    <div className="border-b border-amber-200/70 bg-amber-50/90 text-amber-900">
      <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-2 text-xs sm:text-sm">
        <span className="shrink-0 rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white sm:text-[11px]">
          Ticker
        </span>
        <div className="relative flex-1 overflow-hidden">
          <div
            ref={trackRef}
            className="flex whitespace-nowrap will-change-transform"
          >
            {trackItems.map((item, idx) => (
              <span
                key={`${item.id}-${idx}`}
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

