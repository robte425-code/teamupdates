const NEON_API_BASE = "https://console.neon.tech/api/v2";

export type NeonScheduleFrequency = "hourly" | "daily" | "weekly" | "monthly" | "yearly";

export type NeonBackupScheduleItem = {
  frequency: NeonScheduleFrequency;
  hour?: number;
  day?: number;
  month?: number;
  retention_seconds?: number;
};

export type NeonSnapshot = {
  id: string;
  name?: string;
  created_at?: string;
  source_branch_id?: string;
  snapshot?: {
    created_at?: string;
    name?: string;
  };
};

export type NeonBranch = {
  id: string;
  name: string;
  primary?: boolean;
  default?: boolean;
};

export type NeonProject = {
  id: string;
  name?: string;
  default_branch_id?: string;
  history_retention_seconds?: number;
};

function getNeonApiKey(): string | null {
  const key = process.env.NEON_API_KEY?.trim();
  return key || null;
}

export function isNeonApiConfigured(): boolean {
  return Boolean(getNeonApiKey());
}

async function neonFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const apiKey = getNeonApiKey();
  if (!apiKey) {
    throw new Error("NEON_API_KEY is not configured.");
  }

  const res = await fetch(`${NEON_API_BASE}${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${apiKey}`,
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
    cache: "no-store",
  });

  const data = (await res.json().catch(() => ({}))) as T & {
    message?: string;
    error?: string | { message?: string };
  };

  if (!res.ok) {
    const nested =
      typeof data.error === "object" && data.error?.message ? data.error.message : null;
    const message =
      nested ||
      (typeof data.error === "string" ? data.error : null) ||
      data.message ||
      `Neon API error (${res.status})`;
    throw new Error(message);
  }

  return data;
}

export async function getNeonProject(projectId: string): Promise<NeonProject> {
  const data = await neonFetch<{ project: NeonProject }>(`/projects/${projectId}`);
  return data.project;
}

export async function listNeonBranches(projectId: string): Promise<NeonBranch[]> {
  const data = await neonFetch<{ branches: NeonBranch[] }>(`/projects/${projectId}/branches`);
  return data.branches ?? [];
}

export async function listNeonSnapshots(projectId: string): Promise<NeonSnapshot[]> {
  const data = await neonFetch<{ snapshots: NeonSnapshot[] }>(`/projects/${projectId}/snapshots`);
  return data.snapshots ?? [];
}

export async function getNeonBackupSchedule(
  projectId: string,
  branchId: string
): Promise<NeonBackupScheduleItem[]> {
  const data = await neonFetch<{ schedule: NeonBackupScheduleItem[] }>(
    `/projects/${projectId}/branches/${branchId}/backup_schedule`
  );
  return data.schedule ?? [];
}

export async function createNeonSnapshot(
  projectId: string,
  branchId: string,
  name?: string
): Promise<{ snapshot: NeonSnapshot; operation_id?: string }> {
  const body: { name?: string } = {};
  if (name) body.name = name;
  return neonFetch(`/projects/${projectId}/branches/${branchId}/snapshot`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function snapshotCreatedAt(snapshot: NeonSnapshot): string | null {
  return snapshot.created_at || snapshot.snapshot?.created_at || null;
}

export function snapshotDisplayName(snapshot: NeonSnapshot): string | null {
  return snapshot.name || snapshot.snapshot?.name || null;
}

export function formatHistoryRetention(seconds: number | null | undefined): string | null {
  if (seconds == null || seconds <= 0) return "Disabled";
  const days = Math.round(seconds / 86400);
  if (days >= 1) return `${days} day${days === 1 ? "" : "s"}`;
  const hours = Math.round(seconds / 3600);
  if (hours >= 1) return `${hours} hour${hours === 1 ? "" : "s"}`;
  const minutes = Math.round(seconds / 60);
  return `${minutes} minute${minutes === 1 ? "" : "s"}`;
}

export function formatScheduleSummary(schedule: NeonBackupScheduleItem[]): string {
  if (schedule.length === 0) return "No schedule";

  return schedule
    .map((item) => {
      const freq = item.frequency.charAt(0).toUpperCase() + item.frequency.slice(1);
      const at =
        item.hour != null ? ` at ${String(item.hour).padStart(2, "0")}:00 UTC` : "";
      const retention =
        item.retention_seconds != null
          ? `, keep ${formatHistoryRetention(item.retention_seconds)?.toLowerCase()}`
          : "";
      return `${freq}${at}${retention}`;
    })
    .join("; ");
}
