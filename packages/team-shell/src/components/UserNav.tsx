"use client";

import { useEffect, useState } from "react";
import type { ElementType } from "react";
import type { UserNavLink } from "../nav-config";
import { PAYROLL_NAV_KEY, PAYROLL_UNREAD_API_PATH } from "../nav-config";

const linkClass =
  "rounded-lg px-3 py-2 text-sm font-medium transition-colors text-stone-600 hover:bg-stone-50 hover:text-stone-900";

const unreadPayrollClass =
  "bg-emerald-50 text-emerald-900 ring-1 ring-inset ring-emerald-300 after:ml-1.5 after:inline-block after:h-2 after:w-2 after:rounded-full after:bg-emerald-600 after:align-middle";

function usePayrollUnread(refreshKey?: string) {
  const [hasUnread, setHasUnread] = useState(false);
  const [title, setTitle] = useState<string | undefined>();

  useEffect(() => {
    let cancelled = false;
    fetch(PAYROLL_UNREAD_API_PATH, { credentials: "same-origin", cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        const unread = Boolean(data.hasUnreadPayStub);
        setHasUnread(unread);
        setTitle(
          unread && data.checkDate
            ? `New pay stub for ${String(data.checkDate).slice(0, 10)}`
            : unread
              ? "New pay stub available"
              : undefined
        );
      })
      .catch(() => {
        if (!cancelled) {
          setHasUnread(false);
          setTitle(undefined);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  return { hasUnread, title };
}

export function UserNav({
  links,
  pathname,
  LinkComponent,
  refreshKey,
}: {
  links: UserNavLink[];
  pathname: string;
  LinkComponent: ElementType<any>;
  /** Change when impersonation or session identity changes to refetch unread state. */
  refreshKey?: string;
}) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Link = LinkComponent as any;
  const payrollUnread = usePayrollUnread(refreshKey);

  return (
    <>
      {links.map((item) => {
        const isPayroll = item.navKey === PAYROLL_NAV_KEY;
        const unread = isPayroll && payrollUnread.hasUnread;
        const unreadClass = unread ? unreadPayrollClass : "";
        const unreadTitle = unread ? payrollUnread.title : undefined;

        if (item.kind === "internal") {
          const active = item.isActive(pathname);
          return (
            <Link
              key={item.href + item.label}
              href={item.href}
              className={`${linkClass} ${active ? "bg-stone-100 text-stone-900" : ""} ${unreadClass}`}
              title={unreadTitle}
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
            className={`${linkClass} ${unreadClass}`}
            title={unreadTitle}
          >
            {item.label}
          </a>
        );
      })}
    </>
  );
}
