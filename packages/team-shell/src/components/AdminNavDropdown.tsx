"use client";

import { useEffect, useRef, useState, type ElementType, type ReactNode } from "react";
import type { AdminNavSection } from "../nav-config";

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      className={`h-4 w-4 shrink-0 text-stone-500 transition-transform ${open ? "rotate-180" : ""}`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      aria-hidden
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  );
}

export function AdminNavDropdown({
  sections,
  pathname,
  LinkComponent,
}: {
  sections: AdminNavSection[];
  pathname: string;
  LinkComponent: ElementType<any>;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onPointerDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Link = LinkComponent as any;

  return (
    <div className="relative shrink-0" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex items-center gap-1.5 rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-800 shadow-sm transition-colors hover:bg-stone-50"
      >
        <span className="max-w-[10rem] truncate sm:max-w-none">Admin</span>
        <Chevron open={open} />
      </button>
      {open && (
        <ul
          role="menu"
          aria-label="Admin"
          className="absolute right-0 top-full z-30 mt-1 min-w-[12rem] rounded-lg border border-stone-200 bg-white py-1 shadow-lg"
        >
          {sections.map((section, si) => (
            <li key={section.label} role="presentation">
              {si > 0 && <div className="mt-1 border-t border-stone-100" />}
              <div className="border-b border-stone-100 px-3 py-2 last:border-b-0">
                <span className="text-xs font-semibold uppercase tracking-wide text-stone-500">
                  {section.label}
                </span>
              </div>
              {section.items.map((item) => {
                const isCurrent = item.isActive?.(pathname) ?? false;
                const className = `block px-3 py-2 text-sm font-medium ${
                  isCurrent
                    ? "bg-stone-100 text-stone-900"
                    : "text-stone-600 hover:bg-stone-50 hover:text-stone-900"
                }`;
                if (item.external) {
                  return (
                    <a
                      key={item.href}
                      role="menuitem"
                      href={item.href}
                      className={className}
                      onClick={() => setOpen(false)}
                    >
                      {item.label}
                    </a>
                  );
                }
                return (
                  <Link
                    key={item.href}
                    role="menuitem"
                    href={item.href}
                    className={className}
                    onClick={() => setOpen(false)}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
