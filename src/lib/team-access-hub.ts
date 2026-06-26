import { teamUrls } from "@team/shell/nav-config";

export type InternalAccessUser = {
  email: string;
  displayName?: string;
  signInEnabled: boolean;
  isAdmin: boolean;
};

export type AccessRow = {
  email: string;
  displayName: string;
  requests: { agent: boolean };
  hr: { admin: boolean };
  payroll: { admin: boolean };
  voc: { admin: boolean };
};

function secret(): string | null {
  const s = process.env.TEAM_INTERNAL_ACCESS_SECRET?.trim();
  return s || null;
}

function appTargets() {
  const urls = teamUrls();
  return [
    { id: "requests" as const, url: `${urls.requests}/api/internal/team-access` },
    { id: "hr" as const, url: `${urls.hr}/api/internal/team-access` },
    { id: "payroll" as const, url: `${urls.payroll.replace(/\/my-leave\.html$/, "")}/api/internal/team-access` },
    {
      id: "voc" as const,
      url: `${urls.vocHotline}/api/internal/team-access`,
      vocAdmins: true,
    },
  ];
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T | null> {
  try {
    const res = await fetch(url, { ...init, cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

function emptyRow(email: string): AccessRow {
  return {
    email,
    displayName: "",
    requests: { agent: false },
    hr: { admin: false },
    payroll: { admin: false },
    voc: { admin: false },
  };
}

export async function fetchAggregatedAccess(): Promise<{
  rows: AccessRow[];
  appErrors: string[];
}> {
  const map = new Map<string, AccessRow>();
  const token = secret();
  const appErrors: string[] = [];
  const headers = token ? { Authorization: `Bearer ${token}` } : undefined;

  for (const app of appTargets()) {
    if (!token) {
      appErrors.push(`${app.id}: TEAM_INTERNAL_ACCESS_SECRET not configured`);
      continue;
    }
    if (app.vocAdmins) {
      const data = await fetchJson<{ admins?: string[] }>(app.url, { headers });
      if (!data?.admins) {
        appErrors.push(`${app.id}: could not load`);
        continue;
      }
      for (const email of data.admins) {
        const key = email.toLowerCase();
        const row = map.get(key) ?? emptyRow(key);
        row.voc.admin = true;
        map.set(key, row);
      }
      continue;
    }

    const data = await fetchJson<{ users?: InternalAccessUser[] }>(app.url, { headers });
    if (!data?.users) {
      appErrors.push(`${app.id}: could not load`);
      continue;
    }
    for (const u of data.users) {
      const key = u.email.toLowerCase();
      const row = map.get(key) ?? emptyRow(key);
      if (u.displayName) row.displayName = u.displayName;
      if (app.id === "requests") {
        if (u.isAdmin) row.requests.agent = true;
      } else if (app.id === "hr") {
        if (u.isAdmin) row.hr.admin = true;
      } else if (app.id === "payroll") {
        if (u.isAdmin) row.payroll.admin = true;
      }
      map.set(key, row);
    }
  }

  const rows = Array.from(map.values()).sort((a, b) => a.email.localeCompare(b.email));
  return { rows, appErrors };
}

export async function saveAggregatedAccess(rows: AccessRow[]): Promise<{ appErrors: string[] }> {
  const token = secret();
  const appErrors: string[] = [];
  if (!token) {
    return { appErrors: ["TEAM_INTERNAL_ACCESS_SECRET not configured on Updates"] };
  }
  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };

  const validRows = rows.filter((r) => r.email.includes("@"));

  const requestsUsers: InternalAccessUser[] = validRows
    .filter((r) => r.requests.agent)
    .map((r) => ({
      email: r.email,
      displayName: r.displayName,
      signInEnabled: true,
      isAdmin: true,
    }));

  const hrUsers: InternalAccessUser[] = validRows
    .filter((r) => r.hr.admin)
    .map((r) => ({
      email: r.email,
      displayName: r.displayName,
      signInEnabled: true,
      isAdmin: true,
    }));

  const payrollUsers: InternalAccessUser[] = validRows
    .filter((r) => r.payroll.admin)
    .map((r) => ({
      email: r.email,
      displayName: r.displayName,
      signInEnabled: true,
      isAdmin: true,
    }));

  const vocAdmins = validRows.filter((r) => r.voc.admin).map((r) => r.email.toLowerCase());

  const targets = appTargets();
  for (const app of targets) {
    const url = app.url;
    let body: unknown;
    if (app.vocAdmins) {
      body = { admins: vocAdmins };
    } else if (app.id === "requests") {
      body = { users: requestsUsers };
    } else if (app.id === "hr") {
      body = { users: hrUsers };
    } else if (app.id === "payroll") {
      body = { users: payrollUsers };
    } else {
      continue;
    }
    try {
      const res = await fetch(url, { method: "PUT", headers, body: JSON.stringify(body) });
      if (!res.ok) appErrors.push(`${app.id}: save failed (${res.status})`);
    } catch {
      appErrors.push(`${app.id}: save failed`);
    }
  }

  return { appErrors };
}
