"use client";

import Image from "next/image";
import { signOut } from "next-auth/react";
import Link from "next/link";

export function Header() {
  return (
    <header className="border-b border-stone-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
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
