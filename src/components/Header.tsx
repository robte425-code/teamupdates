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

  const gradientByTime: Record<typeof timeOfDay, string> = {
    morning: "linear-gradient(120deg, #fef7ed 0%, #fef3c7 40%, #e0f2fe 100%)",
    afternoon: "linear-gradient(110deg, #fffbeb 0%, #fef3c7 50%, #fde68a 100%)",
    evening: "linear-gradient(130deg, #fef2f2 0%, #e0e7ff 50%, #fce7f3 100%)",
    night: "linear-gradient(120deg, #eef2ff 0%, #e0e7ff 40%, #ede9fe 100%)",
  };

  return (
    <header className="sticky top-0 z-10 shadow-sm backdrop-blur-sm">
      <div className="relative overflow-hidden border-b border-stone-200/80">
        {/* Time-of-day base gradient */}
        <div
          className="absolute inset-0 -z-[0]"
          style={{ background: gradientByTime[timeOfDay] }}
        />
        {/* Moving gradient overlay - visible sweep */}
        <div
          className="absolute inset-0 -z-[0] animate-gradient-sweep bg-[length:400%_400%] bg-no-repeat opacity-70"
          style={{
            backgroundImage: `linear-gradient(105deg, transparent 0%, rgba(255,255,255,0.5) 25%, transparent 50%, rgba(255,255,255,0.3) 75%, transparent 100%)`,
          }}
        />
        {/* Strong shimmer sweep */}
        <div
          className="absolute inset-0 -z-[0] animate-nav-shimmer bg-[length:200%_100%] bg-no-repeat opacity-90"
          style={{
            backgroundImage: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.45) 45%, transparent 55%, rgba(255,255,255,0.2) 70%, transparent 100%)",
          }}
        />
        {/* Floating orbs - larger, more visible */}
        <div className="pointer-events-none absolute inset-0 -z-[0] overflow-hidden">
          <div className="absolute -left-8 top-1/2 h-32 w-32 rounded-full bg-amber-200/50 blur-2xl animate-float-slow" />
          <div className="absolute right-1/4 -top-4 h-28 w-28 rounded-full bg-sky-200/50 blur-xl animate-float-slower" />
          <div className="absolute bottom-0 left-1/3 h-36 w-36 rounded-full bg-rose-200/40 blur-2xl animate-float-slow" style={{ animationDelay: "-1.5s" }} />
          <div className="absolute right-0 top-1/2 h-24 w-24 rounded-full bg-violet-200/45 blur-xl animate-float-slower" style={{ animationDelay: "-3s" }} />
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
