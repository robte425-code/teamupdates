import { parseBackupAppId, type TeamBackupAppId } from "@/lib/teamBackupApps";

export const SHAREPOINT_BACKUPS_FOLDER = "Backups";

export type SharePointBackupFile = {
  id: string;
  name: string;
  appId: TeamBackupAppId | null;
  size: number;
  createdAt: string;
  webUrl: string;
};

type GraphToken = { access_token: string; expires_at: number };

let cachedToken: GraphToken | null = null;

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is not configured`);
  return value;
}

function sharePointSiteRef(): { hostname: string; path: string } {
  const siteUrl = requireEnv("SHAREPOINT_SITE_URL");
  const parsed = new URL(siteUrl);
  return { hostname: parsed.hostname, path: parsed.pathname.replace(/\/$/, "") || "/" };
}

async function getGraphAccessToken(): Promise<string> {
  const now = Date.now();
  if (cachedToken && cachedToken.expires_at > now + 60_000) {
    return cachedToken.access_token;
  }

  const tenantId = requireEnv("AZURE_AD_TENANT_ID");
  const clientId = requireEnv("AZURE_AD_CLIENT_ID");
  const clientSecret = requireEnv("AZURE_AD_CLIENT_SECRET");

  const res = await fetch(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      scope: "https://graph.microsoft.com/.default",
      grant_type: "client_credentials",
    }),
  });

  const data = (await res.json()) as {
    access_token?: string;
    expires_in?: number;
    error_description?: string;
  };

  if (!res.ok || !data.access_token) {
    throw new Error(data.error_description || "Could not authenticate with Microsoft Graph");
  }

  cachedToken = {
    access_token: data.access_token,
    expires_at: now + (data.expires_in ?? 3600) * 1000,
  };
  return cachedToken.access_token;
}

async function graphFetch(path: string, init?: RequestInit): Promise<Response> {
  const token = await getGraphAccessToken();
  return fetch(`https://graph.microsoft.com/v1.0${path}`, {
    ...init,
    headers: {
      ...(init?.headers ?? {}),
      Authorization: `Bearer ${token}`,
    },
  });
}

let cachedSiteId: string | null = null;

async function getSiteId(): Promise<string> {
  if (cachedSiteId) return cachedSiteId;
  const { hostname, path } = sharePointSiteRef();
  const res = await graphFetch(`/sites/${hostname}:${path}`);
  const data = (await res.json()) as { id?: string; error?: { message?: string } };
  if (!res.ok || !data.id) {
    throw new Error(data.error?.message || "Could not resolve SharePoint site");
  }
  cachedSiteId = data.id;
  return data.id;
}

function toSharePointFile(item: {
  id: string;
  name: string;
  size?: number;
  createdDateTime?: string;
  webUrl?: string;
}): SharePointBackupFile {
  return {
    id: item.id,
    name: item.name,
    appId: parseBackupAppId(item.name),
    size: item.size ?? 0,
    createdAt: item.createdDateTime ?? new Date().toISOString(),
    webUrl: item.webUrl ?? "",
  };
}

export async function listSharePointBackups(): Promise<SharePointBackupFile[]> {
  const siteId = await getSiteId();
  const res = await graphFetch(
    `/sites/${siteId}/drive/root:/${encodeURIComponent(SHAREPOINT_BACKUPS_FOLDER)}:/children?$select=id,name,size,createdDateTime,webUrl`
  );
  const data = (await res.json()) as {
    value?: Array<{
      id: string;
      name: string;
      size?: number;
      createdDateTime?: string;
      webUrl?: string;
      file?: Record<string, unknown>;
    }>;
    error?: { message?: string };
  };

  if (res.status === 404) return [];

  if (!res.ok) {
    throw new Error(data.error?.message || "Could not list SharePoint backups");
  }

  return (data.value ?? [])
    .filter((item) => item.file)
    .map((item) => toSharePointFile(item))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

async function ensureBackupsFolder(siteId: string): Promise<void> {
  const res = await graphFetch(
    `/sites/${siteId}/drive/root:/${encodeURIComponent(SHAREPOINT_BACKUPS_FOLDER)}`
  );
  if (res.ok) return;
  if (res.status !== 404) {
    const data = (await res.json()) as { error?: { message?: string } };
    throw new Error(data.error?.message || "Could not access SharePoint Backups folder");
  }

  const create = await graphFetch(`/sites/${siteId}/drive/root/children`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: SHAREPOINT_BACKUPS_FOLDER,
      folder: {},
      "@microsoft.graph.conflictBehavior": "fail",
    }),
  });

  if (!create.ok && create.status !== 409) {
    const data = (await create.json()) as { error?: { message?: string } };
    throw new Error(data.error?.message || "Could not create SharePoint Backups folder");
  }
}

export async function uploadSharePointBackup(
  filename: string,
  content: Buffer,
  contentType: string
): Promise<SharePointBackupFile> {
  const siteId = await getSiteId();
  await ensureBackupsFolder(siteId);
  const path = `/sites/${siteId}/drive/root:/${encodeURIComponent(SHAREPOINT_BACKUPS_FOLDER)}/${encodeURIComponent(filename)}:/content`;
  const res = await graphFetch(path, {
    method: "PUT",
    headers: {
      "Content-Type": contentType,
    },
    body: new Uint8Array(content),
  });

  const data = (await res.json()) as {
    id?: string;
    name?: string;
    size?: number;
    createdDateTime?: string;
    webUrl?: string;
    error?: { message?: string };
  };

  if (!res.ok || !data.id || !data.name) {
    throw new Error(data.error?.message || "Could not upload backup to SharePoint");
  }

  return toSharePointFile({
    id: data.id,
    name: data.name,
    size: data.size,
    createdDateTime: data.createdDateTime,
    webUrl: data.webUrl,
  });
}

export async function downloadSharePointBackup(
  itemId: string
): Promise<{ name: string; content: Buffer }> {
  const siteId = await getSiteId();
  const res = await graphFetch(`/sites/${siteId}/drive/items/${itemId}/content`);
  if (!res.ok) {
    throw new Error("Could not download backup from SharePoint");
  }

  const contentDisposition = res.headers.get("content-disposition") ?? "";
  const match = /filename="([^"]+)"/i.exec(contentDisposition);
  const name = match?.[1] ?? "backup.bin";
  const content = Buffer.from(await res.arrayBuffer());
  return { name, content };
}

export function isSharePointConfigured(): boolean {
  return Boolean(process.env.SHAREPOINT_SITE_URL?.trim());
}
