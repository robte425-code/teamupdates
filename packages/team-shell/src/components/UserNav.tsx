"use client";

import type { ElementType, ReactNode } from "react";
import type { UserNavLink } from "../nav-config";

const linkClass =
  "rounded-lg px-3 py-2 text-sm font-medium transition-colors text-stone-600 hover:bg-stone-50 hover:text-stone-900";

export function UserNav({
  links,
  pathname,
  LinkComponent,
}: {
  links: UserNavLink[];
  pathname: string;
  LinkComponent: ElementType<any>;
}) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Link = LinkComponent as any;

  return (
    <>
      {links.map((item) => {
        if (item.kind === "internal") {
          const active = item.isActive(pathname);
          return (
            <Link
              key={item.href + item.label}
              href={item.href}
              className={`${linkClass} ${active ? "bg-stone-100 text-stone-900" : ""}`}
            >
              {item.label}
            </Link>
          );
        }
        return (
          <a
            key={item.href + item.label}
            href={item.href}
            target={item.openInNewTab ? "_blank" : undefined}
            rel={item.openInNewTab ? "noopener noreferrer" : undefined}
            className={linkClass}
          >
            {item.label}
          </a>
        );
      })}
    </>
  );
}
