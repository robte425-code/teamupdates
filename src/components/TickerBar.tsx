"use client";

import { useEffect, useRef, useState } from "react";
import { TICKER_REFRESH_EVENT } from "@/lib/tickerRefresh";
import {
  TICKER_SPEED_DEFAULT_PPS,
  clampTickerSpeedPxPerSec,
} from "@/lib/tickerSpeed";

type TickerItem = {
  id: string;
  text: string;
};

export function TickerBar() {
  const [items, setItems] = useState<TickerItem[]>([]);
  const [speedPps, setSpeedPps] = useState(TICKER_SPEED_DEFAULT_PPS);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const groupRef = useRef<HTMLDivElement | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    function loadItems() {
      fetch("/api/ticker", { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : []))
        .then((data) => {
          if (!cancelled && Array.isArray(data)) {
            setItems(data);
          }
        })
        .catch(() => {
          if (!cancelled) setItems([]);
        });
    }
    function loadSettings() {
      fetch("/api/ticker/settings", { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (
            !cancelled &&
            data &&
            typeof data.scrollSpeedPxPerSec === "number"
          ) {
            setSpeedPps(clampTickerSpeedPxPerSec(data.scrollSpeedPxPerSec));
          }
        })
        .catch(() => {
          /* keep default speed */
        });
    }
    function loadAll() {
      loadItems();
      loadSettings();
    }
    loadAll();
    const onRefresh = () => loadAll();
    window.addEventListener(TICKER_REFRESH_EVENT, onRefresh);
    return () => {
      cancelled = true;
      window.removeEventListener(TICKER_REFRESH_EVENT, onRefresh);
    };
  }, []);

  useEffect(() => {
    const el = trackRef.current;
    const groupEl = groupRef.current;
    const containerEl = containerRef.current;
    if (!el || !groupEl || !containerEl) return;

    let width = groupEl.offsetWidth || 1;
    // Ensure one cycle is wider than the viewport for a smooth feel.
    if (width < containerEl.offsetWidth) {
      width = containerEl.offsetWidth;
    }
    let offset = 0;
    let last = performance.now();
    let frame: number;
    const speed = speedPps;

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
      width = groupEl.offsetWidth || 1;
      if (width < containerEl.offsetWidth) {
        width = containerEl.offsetWidth;
      }
    };
    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", handleResize);
    };
  }, [items, speedPps]);

  if (!items.length) return null;

  // Repeat small lists so one full cycle is long enough visually.
  const repeats = Math.max(3, 12 - items.length);
  const cycleItems = Array.from({ length: repeats }, () => items).flat();

  return (
    <div className="border-b border-amber-200/70 bg-amber-50/90 text-amber-900">
      <div className="mx-auto flex max-w-6xl items-center px-4 py-2 text-xs sm:text-sm">
        <div ref={containerRef} className="relative min-w-0 flex-1 overflow-hidden">
          <div
            ref={trackRef}
            className="flex whitespace-nowrap will-change-transform"
          >
            <div ref={groupRef} className="flex">
              {cycleItems.map((item, idx) => (
                <span
                  key={`g1-${item.id}-${idx}`}
                  className="mr-8 inline-flex items-center gap-2"
                >
                  <span className="inline-block h-1 w-1 rounded-full bg-amber-500" />
                  <span>{item.text}</span>
                </span>
              ))}
            </div>
            <div className="flex" aria-hidden="true">
              {cycleItems.map((item, idx) => (
                <span
                  key={`g2-${item.id}-${idx}`}
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
    </div>
  );
}

