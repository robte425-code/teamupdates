"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import {
  AdminNavDropdown,
  AdminViewToggle,
  ImpersonationBanner,
  UserNav,
  firstDisplayName,
  readAdminViewPreference,
  timeGreeting,
  updatesAdminSections,
  updatesUserNav,
  writeAdminViewPreference,
  ViewAsDropdown,
} from "@team/shell";
import { useEffect, useState, type ElementType } from "react";
import { useImpersonation } from "@/contexts/ImpersonationContext";
import { TickerBar } from "./TickerBar";

export function Header() {
  const pathname = usePathname() ?? "";
  const { data: session } = useSession();
  const { canImpersonate, impersonating, real, effective, target } = useImpersonation();
  const [showAdminView, setShowAdminViewState] = useState(true);

  useEffect(() => {
    setShowAdminViewState(readAdminViewPreference());
  }, []);

  const isRealAdmin = (session?.user as { role?: string } | undefined)?.role === "admin";
  const showAdminNav = isRealAdmin && showAdminView && !impersonating;

  function toggleViewMode() {
    const next = !showAdminView;
    setShowAdminViewState(next);
    writeAdminViewPreference(next);
  }

  const greeting = timeGreeting();
  const displayName = firstDisplayName(effective.name, effective.email);
  const userNav = updatesUserNav(pathname);
  const adminSections = updatesAdminSections(pathname);

  const NextLink = Link as ElementType;

  return (
    <>
      {impersonating && target && (
        <ImpersonationBanner name={target.name} email={target.email} />
      )}
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
                <nav className="flex min-w-0 flex-1 flex-wrap items-center gap-2 sm:flex-nowrap">
                  {showAdminNav && (
                    <AdminNavDropdown
                      sections={adminSections}
                      pathname={pathname}
                      LinkComponent={NextLink}
                    />
                  )}
                  <UserNav links={userNav} pathname={pathname} LinkComponent={NextLink} />
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
              {isRealAdmin && !impersonating && (
                <AdminViewToggle showAdminView={showAdminView} onToggle={toggleViewMode} />
              )}
              {canImpersonate && (
                <ViewAsDropdown
                  realEmail={real.email}
                  realName={real.name}
                  currentEmail={effective.email}
                  isImpersonating={impersonating}
                />
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
    </>
  );
}
