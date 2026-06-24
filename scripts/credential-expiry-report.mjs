#!/usr/bin/env node
/**
 * Report credential expiration dates for TEAM apps.
 *
 * Auto-discovers:
 *   - Azure Entra client secrets & certs (Microsoft Graph)
 *   - Vercel personal/team auth tokens (Vercel API)
 *
 * Policy-based reminders from scripts/credential-expiry-registry.json
 * (API keys with no vendor expiry — update lastRotated after each rotation).
 *
 * Usage:
 *   node scripts/credential-expiry-report.mjs
 *   node scripts/credential-expiry-report.mjs --json
 *   node scripts/credential-expiry-report.mjs --days 60
 *   node scripts/credential-expiry-report.mjs --days 60 --notify
 *
 * Env (notifications — optional):
 *   RESEND_API_KEY, CREDENTIAL_ALERT_TO (comma-separated), EMAIL_FROM
 *   SLACK_WEBHOOK_URL
 *   AZURE_GRAPH_CLIENT_ID, AZURE_GRAPH_CLIENT_SECRET, AZURE_GRAPH_TENANT_ID
 *   Or set AZURE_AD_* if that app has Application.Read.All (uncommon).
 *
 * Env (app registration to inspect — usually the TEAM SSO app):
 *   AZURE_APP_CLIENT_ID  (defaults to AZURE_AD_CLIENT_ID)
 *
 * Env (optional Vercel token list):
 *   VERCEL_TOKEN
 */

import { readFileSync, existsSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const REGISTRY_PATH = join(__dirname, "credential-expiry-registry.json");

function loadEnvFile(path) {
  if (!existsSync(path)) return {};
  const out = {};
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    out[key] = val.replace(/\\n$/g, "");
  }
  return out;
}

function mergeEnv() {
  const merged = { ...process.env };
  for (const [key, val] of Object.entries(loadEnvFile(join(ROOT, ".env")))) {
    if (val && !merged[key]) merged[key] = val;
  }
  for (const [key, val] of Object.entries(loadEnvFile(join(ROOT, ".env.production")))) {
    if (val && !merged[key]) merged[key] = val;
  }
  return merged;
}

const env = mergeEnv();

function parseArgs(argv) {
  const opts = { json: false, days: 60, out: null, notify: false, notifyAlways: false };
  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--json") opts.json = true;
    else if (arg === "--days") opts.days = Number(argv[++i] ?? 60);
    else if (arg === "--out") opts.out = argv[++i] ?? null;
    else if (arg === "--notify") opts.notify = true;
    else if (arg === "--notify-always") {
      opts.notify = true;
      opts.notifyAlways = true;
    } else if (arg === "--help" || arg === "-h") {
      console.log(
        `Usage: node scripts/credential-expiry-report.mjs [--json] [--days 60] [--out report.md] [--notify] [--notify-always]`
      );
      process.exit(0);
    }
  }
  return opts;
}

function daysUntil(isoOrMs) {
  const ms = typeof isoOrMs === "number" ? isoOrMs : new Date(isoOrMs).getTime();
  if (!Number.isFinite(ms)) return null;
  return Math.ceil((ms - Date.now()) / 86400000);
}

function formatDate(isoOrMs) {
  const d = typeof isoOrMs === "number" ? new Date(isoOrMs) : new Date(isoOrMs);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { dateStyle: "medium", timeZone: "UTC" });
}

function statusForDays(days) {
  if (days == null) return "unknown";
  if (days < 0) return "expired";
  if (days <= 7) return "critical";
  if (days <= 30) return "warning";
  return "ok";
}

function graphAuthEnv() {
  const tenantId =
    env.AZURE_GRAPH_TENANT_ID?.trim() ||
    env.AZURE_AD_TENANT_ID?.trim() ||
    "";
  const clientId =
    env.AZURE_GRAPH_CLIENT_ID?.trim() ||
    env.AZURE_AD_CLIENT_ID?.trim() ||
    "";
  const clientSecret =
    env.AZURE_GRAPH_CLIENT_SECRET?.trim() ||
    env.AZURE_AD_CLIENT_SECRET?.trim() ||
    "";
  return { tenantId, clientId, clientSecret };
}

async function getGraphToken() {
  const { tenantId, clientId, clientSecret } = graphAuthEnv();
  if (!tenantId || !clientId || !clientSecret) {
    return { error: "Set AZURE_GRAPH_* (or AZURE_AD_*) for Graph API access." };
  }

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

  const data = await res.json();
  if (!res.ok || !data.access_token) {
    return {
      error: data.error_description || data.error || `Graph auth failed (${res.status})`,
    };
  }
  return { token: data.access_token };
}

async function fetchAzureCredentials(warnDays) {
  const appClientId = env.AZURE_APP_CLIENT_ID?.trim() || env.AZURE_AD_CLIENT_ID?.trim();
  if (!appClientId) {
    return { items: [], error: "Set AZURE_APP_CLIENT_ID or AZURE_AD_CLIENT_ID to inspect Entra app secrets." };
  }

  const auth = await getGraphToken();
  if (auth.error) return { items: [], error: auth.error };

  const filter = encodeURIComponent(`appId eq '${appClientId}'`);
  const url = `https://graph.microsoft.com/v1.0/applications?$filter=${filter}&$select=displayName,appId,passwordCredentials,keyCredentials`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${auth.token}`, ConsistencyLevel: "eventual" },
  });
  const data = await res.json();

  if (!res.ok) {
    return {
      items: [],
      error: data.error?.message || `Graph applications query failed (${res.status})`,
    };
  }

  const app = data.value?.[0];
  if (!app) {
    return { items: [], error: `No app registration found for appId ${appClientId}.` };
  }

  const items = [];

  for (const secret of app.passwordCredentials ?? []) {
    if (!secret.endDateTime) continue;
    const days = daysUntil(secret.endDateTime);
    items.push({
      source: "azure",
      type: "client_secret",
      name: `AZURE_AD_CLIENT_SECRET (${secret.displayName || secret.keyId || "unnamed"})`,
      apps: ["Updates", "Requests", "Payroll", "HR", "Voc internal"],
      expiresAt: secret.endDateTime,
      expiresLabel: formatDate(secret.endDateTime),
      daysUntil: days,
      status: statusForDays(days),
      consoleUrl: `https://portal.azure.com/#view/Microsoft_AAD_RegisteredApps/ApplicationMenuBlade/~/Credentials/appId/${app.appId}`,
      hint: secret.hint ? `${secret.hint}…` : undefined,
      appDisplayName: app.displayName,
    });
  }

  for (const cert of app.keyCredentials ?? []) {
    if (!cert.endDateTime) continue;
    const days = daysUntil(cert.endDateTime);
    items.push({
      source: "azure",
      type: "certificate",
      name: `Azure certificate (${cert.displayName || cert.keyId || "unnamed"})`,
      apps: ["Updates", "Requests", "Payroll", "HR", "Voc internal"],
      expiresAt: cert.endDateTime,
      expiresLabel: formatDate(cert.endDateTime),
      daysUntil: days,
      status: statusForDays(days),
      consoleUrl: `https://portal.azure.com/#view/Microsoft_AAD_RegisteredApps/ApplicationMenuBlade/~/Credentials/appId/${app.appId}`,
      appDisplayName: app.displayName,
    });
  }

  items.sort((a, b) => (a.daysUntil ?? 9999) - (b.daysUntil ?? 9999));
  return { items, appDisplayName: app.displayName, appId: app.appId, error: null };
}

async function fetchVercelTokens() {
  const token = env.VERCEL_TOKEN?.trim();
  if (!token) {
    return { items: [], error: "VERCEL_TOKEN not set — skipping Vercel token scan." };
  }

  const res = await fetch("https://api.vercel.com/v5/user/tokens", {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();

  if (!res.ok) {
    return {
      items: [],
      error: data.error?.message || data.message || `Vercel API failed (${res.status})`,
    };
  }

  const items = [];
  for (const t of data.tokens ?? []) {
    const expiresMs = t.expiresAt ?? null;
    const days = expiresMs ? daysUntil(expiresMs) : null;
    items.push({
      source: "vercel",
      type: "auth_token",
      name: `VERCEL_TOKEN (${t.name || t.id})`,
      apps: ["GitHub Actions deploy"],
      expiresAt: expiresMs ? new Date(expiresMs).toISOString() : null,
      expiresLabel: expiresMs ? formatDate(expiresMs) : "No expiry set",
      daysUntil: days,
      status: expiresMs ? statusForDays(days) : "policy",
      consoleUrl: "https://vercel.com/account/settings/tokens",
      activeAt: t.activeAt ? formatDate(t.activeAt) : undefined,
      tokenId: t.id,
    });
  }

  items.sort((a, b) => {
    if (a.daysUntil == null && b.daysUntil == null) return 0;
    if (a.daysUntil == null) return 1;
    if (b.daysUntil == null) return -1;
    return a.daysUntil - b.daysUntil;
  });

  return { items, error: null };
}

function loadPolicyCredentials(warnDays) {
  if (!existsSync(REGISTRY_PATH)) {
    return { items: [], error: `Registry not found: ${REGISTRY_PATH}` };
  }

  const registry = JSON.parse(readFileSync(REGISTRY_PATH, "utf8"));
  const items = [];

  for (const entry of registry.policyCredentials ?? []) {
    let nextDue = null;
    let days = null;
    let status = "unknown";

    if (entry.lastRotated) {
      const last = new Date(entry.lastRotated).getTime();
      nextDue = last + entry.rotateEveryDays * 86400000;
      days = daysUntil(nextDue);
      status = statusForDays(days);
    } else {
      status = "unknown";
    }

    items.push({
      source: "policy",
      type: "rotation_policy",
      id: entry.id,
      name: entry.name,
      apps: entry.apps ?? [],
      expiresAt: nextDue ? new Date(nextDue).toISOString() : null,
      expiresLabel: nextDue ? formatDate(nextDue) : "Set lastRotated in registry",
      daysUntil: days,
      status,
      consoleUrl: entry.consoleUrl,
      notes: entry.notes,
      rotateEveryDays: entry.rotateEveryDays,
      lastRotated: entry.lastRotated,
    });
  }

  items.sort((a, b) => {
    if (a.daysUntil == null && b.daysUntil == null) return a.name.localeCompare(b.name);
    if (a.daysUntil == null) return 1;
    if (b.daysUntil == null) return -1;
    return a.daysUntil - b.daysUntil;
  });

  return { items, error: null };
}

function buildReport(result, warnDays) {
  const lines = [];
  const now = new Date().toISOString();

  lines.push("# TEAM credential expiry report");
  lines.push("");
  lines.push(`Generated: ${formatDate(now)} (${now})`);
  lines.push(`Warning threshold: ${warnDays} days`);
  lines.push("");

  const sections = [
    { title: "Azure Entra (auto)", key: "azure", errors: result.errors.azure },
    { title: "Vercel tokens (auto)", key: "vercel", errors: result.errors.vercel },
    { title: "Rotation policy (registry)", key: "policy", errors: result.errors.policy },
  ];

  for (const section of sections) {
    lines.push(`## ${section.title}`);
    lines.push("");
    if (section.errors) {
      lines.push(`> ${section.errors}`);
      lines.push("");
    }
    const items = result.items.filter((i) => i.source === section.key);
    if (items.length === 0 && !section.errors) {
      lines.push("_No items._");
      lines.push("");
      continue;
    }

    lines.push("| Status | Credential | Expires | Days left | Apps |");
    lines.push("|--------|------------|---------|-----------|------|");
    for (const item of items) {
      const daysLabel = item.daysUntil == null ? "—" : String(item.daysUntil);
      lines.push(
        `| ${item.status} | ${item.name} | ${item.expiresLabel} | ${daysLabel} | ${item.apps.join(", ")} |`
      );
    }
    lines.push("");
  }

  const urgent = result.items.filter(
    (i) => i.status === "expired" || i.status === "critical" || i.status === "warning"
  );

  lines.push("## Action needed");
  lines.push("");
  if (urgent.length === 0) {
    lines.push("Nothing within the warning threshold.");
  } else {
    for (const item of urgent) {
      lines.push(`- **${item.name}** — ${item.expiresLabel} (${item.daysUntil ?? "?"} days) — ${item.consoleUrl || ""}`);
    }
  }
  lines.push("");
  lines.push("---");
  lines.push("Update `lastRotated` in `scripts/credential-expiry-registry.json` after rotating policy credentials.");

  return lines.join("\n");
}

function itemsNeedingAttention(items, warnDays) {
  const attention = items.filter(
    (i) =>
      i.status === "expired" ||
      i.status === "critical" ||
      i.status === "warning" ||
      (i.daysUntil != null && i.daysUntil <= warnDays)
  );
  const unknownPolicy = items.filter((i) => i.source === "policy" && i.status === "unknown");
  return { attention, unknownPolicy };
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildNotifySubject(result, warnDays, notifyAlways) {
  const { attention } = itemsNeedingAttention(result.items, warnDays);
  if (attention.length === 0 && !notifyAlways) {
    return null;
  }
  const expired = attention.filter((i) => i.status === "expired").length;
  const critical = attention.filter((i) => i.status === "critical").length;
  const warning = attention.filter((i) => i.status === "warning").length;
  const upcoming = attention.filter(
    (i) => i.status !== "expired" && i.status !== "critical" && i.status !== "warning"
  ).length;

  if (attention.length === 0) {
    return "[TEAM] Credential expiry report — all clear";
  }
  const parts = [];
  if (expired) parts.push(`${expired} expired`);
  if (critical) parts.push(`${critical} critical`);
  if (warning) parts.push(`${warning} warning`);
  if (upcoming) parts.push(`${upcoming} within ${warnDays}d`);
  return `[TEAM] Credential expiry: ${parts.join(", ")}`;
}

function buildNotifyHtml(result, warnDays, markdown) {
  const { attention, unknownPolicy } = itemsNeedingAttention(result.items, warnDays);
  const lines = [];
  lines.push(`<p>TEAM credential expiry report — ${formatDate(result.generatedAt)}</p>`);

  if (attention.length === 0) {
    lines.push(`<p><strong>All tracked credentials are outside the ${warnDays}-day window.</strong></p>`);
  } else {
    lines.push("<table border=\"1\" cellpadding=\"6\" cellspacing=\"0\" style=\"border-collapse:collapse\">");
    lines.push("<tr><th>Status</th><th>Credential</th><th>Expires</th><th>Days left</th><th>Apps</th></tr>");
    for (const item of attention) {
      const daysLabel = item.daysUntil == null ? "—" : String(item.daysUntil);
      const link = item.consoleUrl
        ? `<a href="${escapeHtml(item.consoleUrl)}">${escapeHtml(item.name)}</a>`
        : escapeHtml(item.name);
      lines.push(
        `<tr><td>${escapeHtml(item.status)}</td><td>${link}</td><td>${escapeHtml(item.expiresLabel)}</td><td>${daysLabel}</td><td>${escapeHtml(item.apps.join(", "))}</td></tr>`
      );
    }
    lines.push("</table>");
  }

  if (unknownPolicy.length > 0) {
    lines.push(`<p><strong>${unknownPolicy.length} policy credential(s)</strong> need <code>lastRotated</code> set in <code>scripts/credential-expiry-registry.json</code>.</p>`);
  }

  if (result.errors.azure || result.errors.vercel) {
    lines.push("<p><strong>Scan notes:</strong></p><ul>");
    if (result.errors.azure) lines.push(`<li>Azure: ${escapeHtml(result.errors.azure)}</li>`);
    if (result.errors.vercel) lines.push(`<li>Vercel: ${escapeHtml(result.errors.vercel)}</li>`);
    lines.push("</ul>");
  }

  lines.push("<p>See <code>docs/CREDENTIAL_ROTATION.md</code> for rotation runbooks.</p>");
  if (markdown) {
    lines.push("<hr/>");
    lines.push(`<pre style="white-space:pre-wrap;font-size:12px">${escapeHtml(markdown)}</pre>`);
  }
  return lines.join("\n");
}

function buildSlackText(result, warnDays, subject) {
  const { attention, unknownPolicy } = itemsNeedingAttention(result.items, warnDays);
  const lines = [subject, ""];
  if (attention.length === 0) {
    lines.push(`All tracked credentials are outside the ${warnDays}-day window.`);
  } else {
    for (const item of attention) {
      const daysLabel = item.daysUntil == null ? "?" : String(item.daysUntil);
      lines.push(`• *${item.status}* — ${item.name} — ${item.expiresLabel} (${daysLabel}d) — ${item.apps.join(", ")}`);
    }
  }
  if (unknownPolicy.length > 0) {
    lines.push("");
    lines.push(`${unknownPolicy.length} policy credential(s) need lastRotated in the registry JSON.`);
  }
  if (result.errors.azure) lines.push("", `Azure scan: ${result.errors.azure}`);
  if (result.errors.vercel) lines.push("", `Vercel scan: ${result.errors.vercel}`);
  lines.push("", "Runbook: docs/CREDENTIAL_ROTATION.md in teamupdates repo.");
  return lines.join("\n");
}

async function sendResendEmail({ to, subject, html, text }) {
  const apiKey = env.RESEND_API_KEY?.trim();
  if (!apiKey) return { ok: false, error: "RESEND_API_KEY not set" };

  const from = env.EMAIL_FROM?.trim() || "TEAM Dashboard <noreply@team-voc.com>";
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to, subject, html, text }),
  });
  const data = await res.json();
  if (!res.ok) {
    return { ok: false, error: data.message || data.error || `Resend failed (${res.status})` };
  }
  return { ok: true, id: data.id };
}

async function sendSlackWebhook(text) {
  const url = env.SLACK_WEBHOOK_URL?.trim();
  if (!url) return { ok: false, error: "SLACK_WEBHOOK_URL not set" };

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) {
    const body = await res.text();
    return { ok: false, error: body || `Slack webhook failed (${res.status})` };
  }
  return { ok: true };
}

async function sendNotifications(result, opts, markdown) {
  if (!opts.notify) return { email: null, slack: null };

  const recipients = (env.CREDENTIAL_ALERT_TO || env.ADMIN_EMAILS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const subject = buildNotifySubject(result, opts.days, opts.notifyAlways);
  if (!subject) {
    console.error("Notify: nothing within threshold — skipping (--notify-always to send anyway).");
    return { email: { ok: true, skipped: true }, slack: { ok: true, skipped: true } };
  }

  const html = buildNotifyHtml(result, opts.days, opts.notifyAlways ? markdown : null);
  const text = buildSlackText(result, opts.days, subject);
  const outcomes = { email: null, slack: null };

  if (recipients.length > 0) {
    outcomes.email = await sendResendEmail({ to: recipients, subject, html, text });
    if (!outcomes.email.ok) {
      console.error(`Email notify failed: ${outcomes.email.error}`);
    } else {
      console.error(`Email sent to ${recipients.join(", ")}`);
    }
  } else if (env.RESEND_API_KEY?.trim()) {
    console.error("Notify: RESEND_API_KEY set but CREDENTIAL_ALERT_TO / ADMIN_EMAILS empty — skipping email.");
  }

  if (env.SLACK_WEBHOOK_URL?.trim()) {
    outcomes.slack = await sendSlackWebhook(text);
    if (!outcomes.slack.ok) {
      console.error(`Slack notify failed: ${outcomes.slack.error}`);
    } else {
      console.error("Slack notification sent.");
    }
  }

  return outcomes;
}

async function main() {
  const opts = parseArgs(process.argv);

  const [azure, vercel, policy] = await Promise.all([
    fetchAzureCredentials(opts.days),
    fetchVercelTokens(),
    Promise.resolve(loadPolicyCredentials(opts.days)),
  ]);

  const items = [...azure.items, ...vercel.items, ...policy.items];

  const result = {
    generatedAt: new Date().toISOString(),
    warnDays: opts.days,
    azureApp: azure.appId
      ? { displayName: azure.appDisplayName, appId: azure.appId }
      : null,
    errors: {
      azure: azure.error,
      vercel: vercel.error,
      policy: policy.error,
    },
    items,
  };

  if (opts.json) {
    const out = JSON.stringify(result, null, 2);
    if (opts.out) writeFileSync(opts.out, out);
    else console.log(out);
    if (opts.notify) {
      const markdown = buildReport(result, opts.days);
      await sendNotifications(result, opts, markdown);
    }
    process.exit(items.some((i) => i.status === "expired") ? 2 : 0);
  }

  const markdown = buildReport(result, opts.days);
  if (opts.out) writeFileSync(opts.out, markdown);
  else console.log(markdown);

  if (opts.notify) {
    await sendNotifications(result, opts, markdown);
  }

  const hasExpired = items.some((i) => i.status === "expired");
  process.exit(hasExpired ? 2 : 0);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
