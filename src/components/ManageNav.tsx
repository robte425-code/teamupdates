"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/manage/updates", label: "Manage updates & reminders" },
  { href: "/manage/key-dates", label: "Manage key dates" },
];

export function ManageNav() {
  const pathname = usePathname() ?? "";

  return (
    <nav className="mb-6 flex flex-wrap gap-1 border-b border-stone-200 pb-4">
      {links.map(({ href, label }) => (
        <Link
          key={href}
          href={href}
          className={`rounded-lg px-3 py-2 text-sm font-medium ${
            pathname === href
              ? "bg-stone-200 text-stone-900"
              : "text-stone-600 hover:bg-stone-100 hover:text-stone-900"
          }`}
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}
