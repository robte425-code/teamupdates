import { parseBackupAppId, type TeamBackupAppId } from "@/lib/teamBackupApps";

export const SHAREPOINT_BACKUPS_FOLDER = "Backups";
const SIMPLE_UPLOAD_MAX_BYTES = 3.5 * 1024 * 1024;
const UPLOAD_CHUNK_BYTES = 10 * 1024 * 1024;

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

async function parseGraphError(res: Response): Promise<string> {
  const text = await res.text().catch(() => "");
  if (!text) return `HTTP ${res.status}`;
  try {
    const data = JSON.parse(text) as { error?: { message?: string; code?: string } };
    return data.error?.message || data.error?.code || text;
  } catch {
    return text;
  }
}

async function parseGraphJson<T>(res: Response): Promise<T | null> {
  const text = await res.text().catch(() => "");
  if (!text) return null;
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

function backupItemPath(siteId: string, filename: string): string {
  return `/sites/${siteId}/drive/root:/${encodeURIComponent(SHAREPOINT_BACKUPS_FOLDER)}/${encodeURIComponent(filename)}`;
}

async function getUploadedBackupItem(
  siteId: string,
  filename: string
): Promise<{ id: string; name: string; size?: number; createdDateTime?: string; webUrl?: string }> {
  const res = await graphFetch(
    `${backupItemPath(siteId, filename)}?$select=id,name,size,webUrl,createdDateTime`
  );
  const data = await parseGraphJson<{ id?: string; name?: string; size?: number; createdDateTime?: string; webUrl?: string }>(res);
  if (!res.ok || !data?.id || !data.name) {
    throw new Error((data as { error?: { message?: string } } | null)?.error?.message || "Could not read uploaded SharePoint backup");
  }
  return data as { id: string; name: string; size?: number; createdDateTime?: string; webUrl?: string };
}

async function uploadWithSession(siteId: string, filename: string, content: Buffer) {
  const sessionRes = await graphFetch(`${backupItemPath(siteId, filename)}:/createUploadSession`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      item: {
        "@microsoft.graph.conflictBehavior": "replace",
        name: filename,
      },
    }),
  });

  const session = await parseGraphJson<{ uploadUrl?: string; error?: { message?: string } }>(sessionRes);
  if (!sessionRes.ok || !session?.uploadUrl) {
    throw new Error(session?.error?.message || (await parseGraphError(sessionRes)));
  }

  let response: Response | null = null;
  for (let start = 0; start < content.length; start += UPLOAD_CHUNK_BYTES) {
    const end = Math.min(start + UPLOAD_CHUNK_BYTES, content.length) - 1;
    const chunk = content.subarray(start, end + 1);
    response = await fetch(session.uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Length": String(chunk.length),
        "Content-Range": `bytes ${start}-${end}/${content.length}`,
      },
      body: new Uint8Array(chunk),
    });

    if (!response.ok && response.status !== 202 && response.status !== 201) {
      throw new Error(await parseGraphError(response));
    }
  }

  if (!response) throw new Error("SharePoint upload failed");
  if (response.status === 200 || response.status === 201) {
    const completed = await parseGraphJson<{
      id: string;
      name: string;
      size?: number;
      createdDateTime?: string;
      webUrl?: string;
    }>(response);
    if (completed?.id && completed.name) return completed;
  }

  return getUploadedBackupItem(siteId, filename);
}

type UploadedItem = {
  id?: string;
  name?: string;
  size?: number;
  createdDateTime?: string;
  webUrl?: string;
  error?: { message?: string };
};

export async function uploadSharePointBackup(
  filename: string,
  content: Buffer,
  contentType: string
): Promise<SharePointBackupFile> {
  const siteId = await getSiteId();
  await ensureBackupsFolder(siteId);

  let data: UploadedItem | null = null;

  if (content.length <= SIMPLE_UPLOAD_MAX_BYTES) {
    const res = await graphFetch(
      `${backupItemPath(siteId, filename)}:/content?@microsoft.graph.conflictBehavior=replace`,
      {
        method: "PUT",
        headers: {
          "Content-Type": contentType || "application/octet-stream",
        },
        body: new Uint8Array(content),
      }
    );
    data = await parseGraphJson<UploadedItem>(res);
    if (!res.ok) {
      throw new Error(data?.error?.message || (await parseGraphError(res)));
    }
    if (!data?.id || !data.name) {
      data = await getUploadedBackupItem(siteId, filename);
    }
  } else {
    data = await uploadWithSession(siteId, filename, content);
  }

  if (!data?.id || !data.name) {
    throw new Error("Could not upload backup to SharePoint");
  }

  return toSharePointFile({
    id: data.id,
    name: data.name,
    size: data.size,
    createdDateTime: data.createdDateTime,
    webUrl: data.webUrl,
  });
}

export async function getSharePointBackupName(itemId: string): Promise<string> {
  const siteId = await getSiteId();
  const res = await graphFetch(`/sites/${siteId}/drive/items/${itemId}?$select=name`);
  const data = (await res.json()) as { name?: string; error?: { message?: string } };
  if (!res.ok || !data.name) {
    throw new Error(data.error?.message || "Could not read SharePoint backup metadata");
  }
  return data.name;
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
