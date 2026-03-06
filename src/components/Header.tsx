"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useSession } from "next-auth/react";
import { TickerBar } from "./TickerBar";

export function Header() {
  const pathname = usePathname() ?? "";
  const { data: session } = useSession();
  const user = session?.user as { role?: string } | undefined;
  const isAdmin = user?.role === "admin";

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
            {(session?.user?.name || session?.user?.email) && (
              <span className="text-sm font-medium text-stone-600">
                Welcome,&nbsp;
                {session.user.name || session.user.email}
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
