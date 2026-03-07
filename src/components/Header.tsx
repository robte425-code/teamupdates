"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useSession } from "next-auth/react";
import { TickerBar } from "./TickerBar";

function timeGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning,";
  if (hour < 17) return "Good afternoon,";
  return "Good evening,";
}

/** Morning 5–11, Afternoon 12–16, Evening 17–20, Night 21–4 */
function getTimeOfDay(): "morning" | "afternoon" | "evening" | "night" {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 12 && hour < 17) return "afternoon";
  if (hour >= 17 && hour < 21) return "evening";
  return "night";
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
  const greeting = timeGreeting();
  const displayName = firstDisplayName(session?.user?.name ?? null, session?.user?.email ?? null);
  const timeOfDay = getTimeOfDay();

  const skyGradientByTime: Record<typeof timeOfDay, { top: string; bottom: string }> = {
    morning: { top: "#e0f2fe", bottom: "#bae6fd" },
    afternoon: { top: "#fef3c7", bottom: "#fde68a" },
    evening: { top: "#e0e7ff", bottom: "#c7d2fe" },
    night: { top: "#c7d2fe", bottom: "#a5b4fc" },
  };
  const sky = skyGradientByTime[timeOfDay];

  return (
    <header className="sticky top-0 z-10 shadow-sm backdrop-blur-sm">
      <div className="relative overflow-hidden border-b border-stone-200/80">
        {/* Synthetic scenic background: rolling hills + flying birds */}
        <div className="absolute inset-0 -z-[0] h-full w-full">
          <svg
            className="h-full w-full object-cover object-bottom"
            viewBox="0 0 800 120"
            preserveAspectRatio="xMidYMax slice"
            aria-hidden
          >
            <defs>
              <linearGradient id="nav-sky" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor={sky.top} />
                <stop offset="100%" stopColor={sky.bottom} />
              </linearGradient>
              <linearGradient id="hill-far" x1="0%" y1="100%" x2="0%" y2="0%">
                <stop offset="0%" stopColor="#86efac" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#bbf7d0" stopOpacity="0.95" />
              </linearGradient>
              <linearGradient id="hill-mid" x1="0%" y1="100%" x2="0%" y2="0%">
                <stop offset="0%" stopColor="#4ade80" stopOpacity="0.85" />
                <stop offset="100%" stopColor="#86efac" stopOpacity="0.9" />
              </linearGradient>
              <linearGradient id="hill-near" x1="0%" y1="100%" x2="0%" y2="0%">
                <stop offset="0%" stopColor="#22c55e" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#4ade80" stopOpacity="0.85" />
              </linearGradient>
            </defs>
            <rect width="800" height="120" fill="url(#nav-sky)" />
            {/* Rolling hills - back to front */}
            <path fill="url(#hill-far)" d="M0,120 Q200,75 400,95 T800,80 V120 H0Z" />
            <path fill="url(#hill-mid)" d="M0,120 Q250,90 500,70 T800,100 V120 H0Z" />
            <path fill="url(#hill-near)" d="M0,120 Q150,100 400,85 T800,95 V120 H0Z" />
          </svg>
          {/* Birds as overlay so they can animate across full width */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute left-0 top-[28%] h-2 w-2 animate-bird-fly opacity-70" style={{ animationDelay: "0s" }}>
              <svg viewBox="0 0 24 12" className="h-full w-auto text-slate-600">
                <path fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" d="M2,8 Q8,2 14,8" />
              </svg>
            </div>
            <div className="absolute left-0 top-[22%] h-2.5 w-2.5 animate-bird-fly opacity-60" style={{ animationDelay: "2.5s" }}>
              <svg viewBox="0 0 24 12" className="h-full w-auto text-slate-600">
                <path fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" d="M2,8 Q8,2 14,8" />
              </svg>
            </div>
            <div className="absolute left-0 top-[38%] h-1.5 w-1.5 animate-bird-fly opacity-50" style={{ animationDelay: "5s" }}>
              <svg viewBox="0 0 24 12" className="h-full w-auto text-slate-600">
                <path fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" d="M2,8 Q8,2 14,8" />
              </svg>
            </div>
          </div>
        </div>
        <div className="relative z-10 mx-auto flex max-w-6xl flex-col gap-4 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
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
            {isAdmin && (
              <nav className="flex flex-wrap gap-0.5">
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
