"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useSession } from "next-auth/react";

export function Header() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const isAdmin = (session?.user as { role?: string })?.role === "admin";

  return (
    <header className="border-b border-stone-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-4">
          <Link href="/" className="flex shrink-0">
            <Image
              src="/team-logo.png"
              alt="Team Vocational Services"
              width={220}
              height={80}
              className="h-16 w-auto object-contain"
              priority
            />
          </Link>
          {isAdmin && (
            <nav className="flex gap-1">
              <Link
                href="/"
                className={`rounded px-3 py-2 text-sm font-medium ${
                  pathname === "/"
                    ? "bg-stone-100 text-stone-900"
                    : "text-stone-600 hover:bg-stone-50 hover:text-stone-900"
                }`}
              >
                Home
              </Link>
              <Link
                href="/manage"
                className={`rounded px-3 py-2 text-sm font-medium ${
                  pathname === "/manage"
                    ? "bg-stone-100 text-stone-900"
                    : "text-stone-600 hover:bg-stone-50 hover:text-stone-900"
                }`}
              >
                Manage
              </Link>
            </nav>
          )}
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="self-end text-sm text-stone-500 hover:text-stone-700 sm:self-center"
        >
          Sign out
        </button>
      </div>
    </header>
  );
}
