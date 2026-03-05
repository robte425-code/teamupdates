"use client";

import { signOut } from "next-auth/react";
import Link from "next/link";

export function Header() {
  return (
    <header className="border-b border-stone-200 bg-white">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
        <Link href="/" className="text-sm font-medium text-stone-700 hover:text-stone-900">
          Home
        </Link>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="text-sm text-stone-500 hover:text-stone-700"
        >
          Sign out
        </button>
      </div>
    </header>
  );
}
