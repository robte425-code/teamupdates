export const DEFAULT_UPDATES_URL = "https://teamvoc-updates.vercel.app";
export const DEFAULT_REQUESTS_URL = "https://team-requests.vercel.app";
export const DEFAULT_VOC_HOTLINE_URL = "https://voc-hotline-nine.vercel.app";
export const DEFAULT_HR_URL = "https://team-hr.vercel.app";
export const DEFAULT_PAYROLL_URL = "https://team-payroll.vercel.app/my-leave.html";

export const PAYROLL_NAV_KEY = "payroll";
export const PAYROLL_UNREAD_API_PATH = "/api/payroll-unread";

export type UserNavLink =
  | {
      kind: "internal";
      href: string;
      label: string;
      isActive: (path: string) => boolean;
      navKey?: string;
    }
  | { kind: "external"; href: string; label: string; openInNewTab?: boolean; navKey?: string };

export type AdminNavItem = {
  href: string;
  label: string;
  isActive?: (path: string) => boolean;
  external?: boolean;
  separatorBefore?: boolean;
};

export type AdminNavSection = {
  label: string;
  items: AdminNavItem[];
};

export function teamUrls(env: NodeJS.ProcessEnv = process.env) {
  return {
    updates: env.NEXT_PUBLIC_UPDATES_URL || DEFAULT_UPDATES_URL,
    requests: env.NEXT_PUBLIC_REQUESTS_URL || DEFAULT_REQUESTS_URL,
    vocHotline: env.NEXT_PUBLIC_VOC_HOTLINE_URL || DEFAULT_VOC_HOTLINE_URL,
    hr: env.NEXT_PUBLIC_HR_URL || DEFAULT_HR_URL,
    payroll: env.NEXT_PUBLIC_PAYROLL_URL || DEFAULT_PAYROLL_URL,
  };
}

/** Access hub + Backup hub — Updates app only; gated by includePlatformHub (super admin). */
export function platformHubAdminItems(
  env?: NodeJS.ProcessEnv,
  onUpdatesApp = false
): AdminNavItem[] {
  const updatesBase = teamUrls(env).updates.replace(/\/$/, "");
  if (onUpdatesApp) {
    return [
      {
        href: "/manage/access",
        label: "Access hub",
        separatorBefore: true,
        isActive: (p) => p.startsWith("/manage/access"),
      },
      {
        href: "/manage/backup",
        label: "Backup hub",
        isActive: (p) => p.startsWith("/manage/backup"),
      },
    ];
  }
  return [
    {
      href: `${updatesBase}/manage/access`,
      label: "Access hub",
      separatorBefore: true,
      external: true,
    },
    {
      href: `${updatesBase}/manage/backup`,
      label: "Backup hub",
      external: true,
    },
  ];
}

function appendPlatformHub(
  section: AdminNavSection,
  env?: NodeJS.ProcessEnv,
  onUpdatesApp = false
): AdminNavSection {
  return {
    ...section,
    items: [...section.items, ...platformHubAdminItems(env, onUpdatesApp)],
  };
}

/** First nav item — TEAM Updates home. Internal on the Updates app, external elsewhere. */
export function dashboardNavLink(
  env?: NodeJS.ProcessEnv,
  onUpdatesApp = false
): UserNavLink {
  const urls = teamUrls(env);
  if (onUpdatesApp) {
    return {
      kind: "internal",
      href: "/",
      label: "Dashboard",
      isActive: (p) => p === "/",
    };
  }
  return {
    kind: "external",
    href: urls.updates,
    label: "Dashboard",
  };
}

/** Canonical user nav order: Dashboard → Requests → Phone book → Voc hotline → Payroll → HR */
export function updatesUserNav(pathname: string, env?: NodeJS.ProcessEnv): UserNavLink[] {
  const urls = teamUrls(env);
  return [
    dashboardNavLink(env, true),
    { kind: "external", href: urls.requests, label: "Requests" },
    {
      kind: "internal",
      href: "/phone-book",
      label: "Phone book",
      isActive: (p) => p.startsWith("/phone-book"),
    },
    { kind: "external", href: urls.vocHotline, label: "Voc hotline" },
    { kind: "external", href: urls.payroll, label: "Payroll", navKey: PAYROLL_NAV_KEY },
    { kind: "external", href: urls.hr, label: "HR" },
  ];
}

export function requestsUserNav(isAgent: boolean, pathname: string, env?: NodeJS.ProcessEnv): UserNavLink[] {
  const urls = teamUrls(env);
  return [
    dashboardNavLink(env, false),
    {
      kind: "internal",
      href: isAgent ? "/dashboard" : "/my-tickets",
      label: "Requests",
      isActive: (p) =>
        p === "/dashboard" ||
        p.startsWith("/dashboard/") ||
        p === "/my-tickets" ||
        p.startsWith("/my-tickets/") ||
        p.startsWith("/tickets") ||
        p.startsWith("/admin"),
    },
    { kind: "external", href: `${urls.updates}/phone-book`, label: "Phone book" },
    { kind: "external", href: urls.vocHotline, label: "Voc hotline" },
    { kind: "external", href: urls.payroll, label: "Payroll", navKey: PAYROLL_NAV_KEY },
    { kind: "external", href: urls.hr, label: "HR" },
  ];
}

export function hrUserNav(pathname: string, env?: NodeJS.ProcessEnv): UserNavLink[] {
  const urls = teamUrls(env);
  return [
    dashboardNavLink(env, false),
    { kind: "external", href: urls.requests, label: "Requests" },
    { kind: "external", href: `${urls.updates.replace(/\/$/, "")}/phone-book`, label: "Phone book" },
    { kind: "external", href: urls.vocHotline, label: "Voc hotline" },
    { kind: "external", href: urls.payroll, label: "Payroll", navKey: PAYROLL_NAV_KEY },
    {
      kind: "internal",
      href: "/",
      label: "HR",
      isActive: () => true,
    },
  ];
}

export function vocHotlineUserNav(pathname: string, env?: NodeJS.ProcessEnv): UserNavLink[] {
  const urls = teamUrls(env);
  return [
    dashboardNavLink(env, false),
    { kind: "external", href: urls.requests, label: "Requests" },
    { kind: "external", href: `${urls.updates}/phone-book`, label: "Phone book" },
    {
      kind: "internal",
      href: "/",
      label: "Voc hotline",
      isActive: (p) => p === "/" || p.startsWith("/chat"),
    },
    { kind: "external", href: urls.payroll, label: "Payroll", navKey: PAYROLL_NAV_KEY },
    { kind: "external", href: urls.hr, label: "HR" },
  ];
}

export function updatesAdminSections(
  _pathname: string,
  options?: { includePlatformHub?: boolean; includeAppAdmin?: boolean }
): AdminNavSection[] {
  const appItems: AdminNavItem[] = [
    { href: "/", label: "Home", isActive: (p) => p === "/" },
    { href: "/manage/updates", label: "Updates", isActive: (p) => p.startsWith("/manage/updates") },
    { href: "/manage/key-dates", label: "Key dates", isActive: (p) => p.startsWith("/manage/key-dates") },
    { href: "/manage/ticker", label: "Ticker", isActive: (p) => p.startsWith("/manage/ticker") },
    { href: "/manage/reminders", label: "Reminders", isActive: (p) => p.startsWith("/manage/reminders") },
    { href: "/manage/popup", label: "Popup window", isActive: (p) => p.startsWith("/manage/popup") },
    { href: "/manage/usage-stats", label: "Usage stats", isActive: (p) => p.startsWith("/manage/usage-stats") },
  ];

  const includeAppAdmin = options?.includeAppAdmin !== false;
  let section: AdminNavSection = {
    label: "Admin",
    items: includeAppAdmin ? appItems : [],
  };

  if (options?.includePlatformHub) {
    section = appendPlatformHub(section, undefined, true);
  }

  if (section.items.length === 0) return [];
  return [section];
}

export function requestsAdminSections(pathname: string, env?: NodeJS.ProcessEnv): AdminNavSection[] {
  return [
    {
      label: "Requests",
      items: [{ href: "/admin", label: "Settings", isActive: (p) => p.startsWith("/admin") }],
    },
  ];
}

export function payrollAdminSections(env?: NodeJS.ProcessEnv): AdminNavSection[] {
  return [
    {
      label: "Payroll",
      items: [
        { href: "/my-leave.html", label: "My balances" },
        { href: "/rates.html", label: "Employee pay rates" },
        { href: "/leave.html", label: "PTO/Sick management" },
        { href: "/access.html", label: "Access management" },
        { href: "/index.html", label: "Analyze spreadsheet" },
      ],
    },
  ];
}

export function hrAdminSections(pathname: string, env?: NodeJS.ProcessEnv): AdminNavSection[] {
  return [
    {
      label: "Admin",
      items: [
        { href: "/admin/employees", label: "Employees", isActive: (p) => p.startsWith("/admin/employees") },
        {
          href: "/admin/onboarding",
          label: "Onboarding templates",
          isActive: (p) => p.startsWith("/admin/onboarding"),
        },
        { href: "/admin/performance", label: "Review cycles", isActive: (p) => p.startsWith("/admin/performance") },
        {
          href: "/admin/acknowledgements",
          label: "Acknowledgements",
          isActive: (p) => p.startsWith("/admin/acknowledgements"),
        },
      ],
    },
  ];
}

export function vocHotlineAdminSections(pathname: string, env?: NodeJS.ProcessEnv): AdminNavSection[] {
  return [
    {
      label: "Admin",
      items: [
        { href: "/", label: "Voc hotline", isActive: (p) => p === "/" || p.startsWith("/chat") },
        { href: "/admin/usage", label: "Usage log", isActive: (p) => p.startsWith("/admin/usage") },
        { href: "/admin/notes", label: "Best practices", isActive: (p) => p.startsWith("/admin/notes") },
        { href: "/admin/terminology", label: "Terminology", isActive: (p) => p.startsWith("/admin/terminology") },
        { href: "/admin/pages", label: "Page ingestion", isActive: (p) => p.startsWith("/admin/pages") },
        { href: "/admin/admins", label: "Admin settings", isActive: (p) => p.startsWith("/admin/admins") },
      ],
    },
  ];
}
