"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useSession } from "next-auth/react";
import { useViewMode } from "@/contexts/ViewModeContext";
import { TickerBar } from "./TickerBar";

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
              <nav className="flex min-w-0 flex-1 flex-wrap items-center gap-0.5 sm:flex-nowrap">
                {showAdminNav && (
                  <>
                    <Link
                      href="/"
                      className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                        pathname === "/"
                          ? "bg-stone-100 text-stone-900"
                          : "text-stone-600 hover:bg-stone-50 hover:text-stone-900"
                      }`}
                    >
                      Home
                    </Link>
                    <Link
                      href="/manage/updates"
                      className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                        pathname.startsWith("/manage/updates")
                          ? "bg-stone-100 text-stone-900"
                          : "text-stone-600 hover:bg-stone-50 hover:text-stone-900"
                      }`}
                    >
                      Updates
                    </Link>
                    <Link
                      href="/manage/key-dates"
                      className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                        pathname.startsWith("/manage/key-dates")
                          ? "bg-stone-100 text-stone-900"
                          : "text-stone-600 hover:bg-stone-50 hover:text-stone-900"
                      }`}
                    >
                      Key dates
                    </Link>
                    <Link
                      href="/manage/ticker"
                      className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                        pathname.startsWith("/manage/ticker")
                          ? "bg-stone-100 text-stone-900"
                          : "text-stone-600 hover:bg-stone-50 hover:text-stone-900"
                      }`}
                    >
                      Ticker
                    </Link>
                    <Link
                      href="/manage/usage-stats"
                      className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                        pathname.startsWith("/manage/usage-stats")
                          ? "bg-stone-100 text-stone-900"
                          : "text-stone-600 hover:bg-stone-50 hover:text-stone-900"
                      }`}
                    >
                      Usage stats
                    </Link>
                  </>
                )}
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
