"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useSession } from "next-auth/react";
import { useEffect, useRef, useState } from "react";
import { useViewMode } from "@/contexts/ViewModeContext";
import { TickerBar } from "./TickerBar";

const ADMIN_NAV_LINKS: { href: string; label: string; isActive: (path: string) => boolean }[] = [
  { href: "/", label: "Home", isActive: (p) => p === "/" },
  {
    href: "/manage/updates",
    label: "Updates",
    isActive: (p) => p.startsWith("/manage/updates"),
  },
  {
    href: "/manage/key-dates",
    label: "Key dates",
    isActive: (p) => p.startsWith("/manage/key-dates"),
  },
  {
    href: "/manage/ticker",
    label: "Ticker",
    isActive: (p) => p.startsWith("/manage/ticker"),
  },
  {
    href: "/manage/usage-stats",
    label: "Admin",
    isActive: (p) => p.startsWith("/manage/usage-stats"),
  },
];

function AdminNavDropdown({ pathname }: { pathname: string }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const active = ADMIN_NAV_LINKS.find((l) => l.isActive(pathname));

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

  return (
    <div className="relative shrink-0" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex items-center gap-1.5 rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-800 shadow-sm transition-colors hover:bg-stone-50"
      >
        <span className="max-w-[10rem] truncate sm:max-w-none">
          {active ? active.label : "Site pages"}
        </span>
        <svg
          className={`h-4 w-4 shrink-0 text-stone-500 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <ul
          role="menu"
          className="absolute left-0 top-full z-30 mt-1 min-w-[12rem] rounded-lg border border-stone-200 bg-white py-1 shadow-lg"
        >
          {ADMIN_NAV_LINKS.map((item) => {
            const isCurrent = item.isActive(pathname);
            return (
              <li key={item.href} role="none">
                <Link
                  role="menuitem"
                  href={item.href}
                  className={`block px-3 py-2 text-sm font-medium ${
                    isCurrent
                      ? "bg-stone-100 text-stone-900"
                      : "text-stone-600 hover:bg-stone-50 hover:text-stone-900"
                  }`}
                  onClick={() => setOpen(false)}
                >
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function timeGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning,";
  if (hour < 17) return "Good afternoon,";
  return "Good evening,";
}

function firstDisplayName(name: string | null | undefined, email: string | null | undefined): string {
  if (name?.trim()) return name.trim().split(/\s+/)[0] ?? name;
  if (email?.trim()) return email.trim().split("@")[0];
  return "";
}

export function Header() {
  const pathname = usePathname() ?? "";
  const { data: session } = useSession();
  const user = session?.user as { role?: string } | undefined;
  const isAdmin = user?.role === "admin";
  const { showAdminView, setShowAdminView } = useViewMode();

  function toggleViewMode() {
    setShowAdminView(!showAdminView);
  }

  const showAdminNav = isAdmin && showAdminView;
  const greeting = timeGreeting();
  const displayName = firstDisplayName(session?.user?.name ?? null, session?.user?.email ?? null);

  return (
    <header className="sticky top-0 z-10 bg-white/95 shadow-sm backdrop-blur-sm">
      <div className="border-b border-stone-200/80">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center gap-6">
            <Link href="/" className="flex shrink-0 transition opacity-90 hover:opacity-100">
              <Image
                src="/team-logo.png"
                alt="Team Vocational Services"
                width={220}
                height={80}
                className="h-14 w-auto object-contain sm:h-16"
                priority
                unoptimized
              />
            </Link>
            {session && (
              <nav className="flex min-w-0 flex-1 flex-wrap items-center gap-2 sm:flex-nowrap">
                {showAdminNav && <AdminNavDropdown pathname={pathname} />}
                <Link
                  href="/phone-book"
                  className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    pathname.startsWith("/phone-book")
                      ? "bg-stone-100 text-stone-900"
                      : "text-stone-600 hover:bg-stone-50 hover:text-stone-900"
                  }`}
                >
                  Phone book
                </Link>
                <a
                  href="https://team-payroll.vercel.app/my-leave.html"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-lg px-3 py-2 text-sm font-medium text-stone-600 transition-colors hover:bg-stone-50 hover:text-stone-900"
                >
                  My balances
                </a>
              </nav>
            )}
          </div>
          <div className="flex items-center gap-3 self-end sm:self-center">
            {displayName && (
              <span className="text-sm font-medium text-stone-600">
                {greeting}&nbsp;
                {displayName}
              </span>
            )}
            {isAdmin && (
              <button
                type="button"
                onClick={toggleViewMode}
                className="rounded-lg px-3 py-2 text-sm font-medium text-stone-600 transition-colors hover:bg-stone-100 hover:text-stone-800"
                title={showAdminView ? "Switch to user view (hide manage links)" : "Switch to admin view (show manage links)"}
              >
                {showAdminView ? "View as user" : "View as admin"}
              </button>
            )}
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="rounded-lg px-3 py-2 text-sm font-medium text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-700"
            >
              Sign out
            </button>
          </div>
        </div>
      </div>
      <TickerBar />
    </header>
  );
}
