#!/usr/bin/env node
/**
 * Verify TEAM SharePoint backups by restoring each into a fresh Postgres database
 * and comparing restored data with the backup file contents.
 *
 * Usage (from updates repo):
 *   node scripts/verify-team-backups.mjs
 *
 * Requires: Docker (all restores run in an isolated local Postgres container),
 * network access to SharePoint Graph API, and optional read-only production DB URLs for comparison.
 */

import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { execSync, spawnSync } from "node:child_process";
import { readFileSync, existsSync, writeFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { Client } from "pg";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const TEAM = join(ROOT, "..");

const require = createRequire(import.meta.url);
const JSZip = require(join(TEAM, "TEAM HR/node_modules/jszip"));
const { restoreHrDatabase } = require(join(TEAM, "TEAM HR/lib/backup.js"));

const DOCKER_IMAGE = "pgvector/pgvector:pg16";
const DOCKER_NAME = "team-backup-verify";
const DOCKER_PORT = 55432;
const PG_PASSWORD = "backupverify";

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

function mergeEnv(...files) {
  const merged = {};
  for (const f of files) {
    for (const [key, val] of Object.entries(loadEnvFile(f))) {
      if (val) merged[key] = val;
    }
  }
  return merged;
}

const updatesEnv = mergeEnv(
  join(ROOT, ".env"),
  join(ROOT, ".env.production")
);
updatesEnv.SHAREPOINT_SITE_URL ||= "https://teamvoc.sharepoint.com/sites/TEAM";

const appEnv = {
  dashboard: updatesEnv,
  requests: mergeEnv(
    join(TEAM, "Tickets/.env"),
    join(TEAM, "Tickets/.env.vercel.production")
  ),
  payroll: loadEnvFile(join(TEAM, "payroll/.env.local")),
  hr: loadEnvFile(join(TEAM, "TEAM HR/.env.local")),
  voc: loadEnvFile(join(TEAM, "VOCHotline/apps/internal/.env")),
};

function dbUrl(env) {
  return (
    env.DATABASE_URL ||
    env.POSTGRES_URL ||
    env.POSTGRES_URL_NON_POOLING ||
    env.RAG_DATABASE_URL ||
    ""
  ).trim();
}

function dockerAvailable() {
  const res = spawnSync("docker", ["info"], { encoding: "utf8" });
  return res.status === 0;
}

function ensureDocker() {
  if (!dockerAvailable()) {
    console.error("Docker is required for backup verification. Start Docker Desktop and re-run.");
    process.exit(1);
  }

  const running = spawnSync("docker", ["ps", "-q", "-f", `name=^${DOCKER_NAME}$`], { encoding: "utf8" });
  if (running.stdout.trim()) return;

  spawnSync("docker", ["rm", "-f", DOCKER_NAME], { stdio: "ignore" });
  execSync(
    `docker run -d --name ${DOCKER_NAME} -e POSTGRES_PASSWORD=${PG_PASSWORD} -p ${DOCKER_PORT}:5432 ${DOCKER_IMAGE}`,
    { stdio: "inherit" }
  );

  for (let i = 0; i < 30; i += 1) {
    const ok = spawnSync(
      "docker",
      ["exec", DOCKER_NAME, "pg_isready", "-U", "postgres"],
      { encoding: "utf8" }
    );
    if (ok.status === 0) return;
    execSync("sleep 1");
  }

  console.error(`Timed out waiting for Postgres in container ${DOCKER_NAME}.`);
  process.exit(1);
}

function tempBaseUrl(dbName) {
  return `postgresql://postgres:${PG_PASSWORD}@127.0.0.1:${DOCKER_PORT}/${dbName}?sslmode=disable`;
}

async function recreateDb(dbName) {
  const admin = new Client({
    connectionString: `postgresql://postgres:${PG_PASSWORD}@127.0.0.1:${DOCKER_PORT}/postgres`,
  });
  await admin.connect();
  await admin.query(`DROP DATABASE IF EXISTS ${dbName}`);
  await admin.query(`CREATE DATABASE ${dbName}`);
  await admin.end();
}

async function applySqlMigrations(migrationsDir, url) {
  const files = readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();
  const client = new Client({ connectionString: url });
  await client.connect();
  try {
    for (const file of files) {
      await client.query(readFileSync(join(migrationsDir, file), "utf8"));
    }
  } finally {
    await client.end();
  }
}

function prismaDockerEnv(url) {
  return {
    ...process.env,
    DATABASE_URL: url,
    DIRECT_URL: url,
  };
}

async function applySchema(appId, url) {
  if (appId === "dashboard") {
    execSync("npx prisma db push --accept-data-loss --skip-generate", {
      cwd: ROOT,
      env: prismaDockerEnv(url),
      stdio: "pipe",
    });
    return;
  }
  if (appId === "requests") {
    await applySqlMigrations(join(TEAM, "Tickets/db/migrations"), url);
    return;
  }
  if (appId === "payroll") {
    await applySqlMigrations(join(TEAM, "payroll/db/migrations"), url);
    return;
  }
  if (appId === "hr") {
    await applySqlMigrations(join(TEAM, "TEAM HR/db/migrations"), url);
    return;
  }
  if (appId === "voc") {
    const schema = readFileSync(join(TEAM, "VOCHotline/apps/internal/db/schema.sql"), "utf8");
    const client = new Client({ connectionString: url });
    await client.connect();
    await client.query(schema.replace(/vector\(1024\)/g, "vector(1024)"));
    await client.end();
  }
}

async function tableFingerprint(client, qualifiedTable) {
  const countRes = await client.query(`SELECT count(*)::int AS c FROM ${qualifiedTable}`);
  const hashRes = await client.query(
    `SELECT md5(coalesce(string_agg(row::text, '' ORDER BY row::text), '')) AS h
     FROM (SELECT row_to_json(t) AS row FROM ${qualifiedTable} t) s`
  );
  return {
    rows: countRes.rows[0]?.c ?? 0,
    hash: hashRes.rows[0]?.h ?? "",
  };
}

async function schemaFingerprint(client, tableSpecs) {
  const parts = [];
  for (const spec of [...tableSpecs].sort((a, b) => a.name.localeCompare(b.name))) {
    const fp = await tableFingerprint(client, spec.qualified);
    parts.push(`${spec.name}:${fp.rows}:${fp.hash}`);
  }
  return createHash("sha256").update(parts.join("\n")).digest("hex");
}

async function listTables(client, schema) {
  const res = await client.query(
    `SELECT table_name FROM information_schema.tables
     WHERE table_schema = $1 AND table_type = 'BASE TABLE'
     ORDER BY table_name`,
    [schema]
  );
  return res.rows.map((r) => r.table_name);
}

// --- SharePoint (minimal Graph client) ---

let graphToken = null;
let graphSiteId = null;

async function graphTokenFetch() {
  const tenantId = updatesEnv.AZURE_AD_TENANT_ID;
  const clientId = updatesEnv.AZURE_AD_CLIENT_ID;
  const clientSecret = updatesEnv.AZURE_AD_CLIENT_SECRET;
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
  if (!data.access_token) throw new Error(data.error_description || "Graph auth failed");
  graphToken = data.access_token;
}

async function graphFetch(path) {
  if (!graphToken) await graphTokenFetch();
  return fetch(`https://graph.microsoft.com/v1.0${path}`, {
    headers: { Authorization: `Bearer ${graphToken}` },
  });
}

async function getSiteId() {
  if (graphSiteId) return graphSiteId;
  const siteUrl = updatesEnv.SHAREPOINT_SITE_URL;
  const parsed = new URL(siteUrl);
  const res = await graphFetch(`/sites/${parsed.hostname}:${parsed.pathname.replace(/\/$/, "") || "/"}`);
  const data = await res.json();
  if (!data.id) throw new Error(data.error?.message || "SharePoint site not found");
  graphSiteId = data.id;
  return graphSiteId;
}

async function listSharePointBackups() {
  const siteId = await getSiteId();
  const res = await graphFetch(
    `/sites/${siteId}/drive/root:/Backups:/children?$select=id,name,size,createdDateTime,webUrl,file,folder`
  );
  const data = await res.json();
  return (data.value ?? [])
    .filter((item) => item.file && !item.folder)
    .sort((a, b) => (b.createdDateTime ?? "").localeCompare(a.createdDateTime ?? ""));
}

async function downloadSharePointBackup(id) {
  const siteId = await getSiteId();
  const res = await graphFetch(`/sites/${siteId}/drive/items/${id}/content`);
  if (!res.ok) throw new Error(`Download failed (${res.status})`);
  const buf = Buffer.from(await res.arrayBuffer());
  const cd = res.headers.get("content-disposition") ?? "";
  const m = /filename="([^"]+)"/i.exec(cd);
  return { name: m?.[1] ?? "backup.bin", content: buf };
}

const APP_PREFIXES = [
  { id: "dashboard", prefix: "Dashboard-", ext: ".sql" },
  { id: "requests", prefix: "Requests-", ext: ".sql" },
  { id: "payroll", prefix: "Payroll-", ext: ".sql" },
  { id: "voc", prefix: "Voc hotline-", ext: ".zip" },
  { id: "hr", prefix: "HR-", ext: ".zip" },
];

function latestBackupForApp(backups, appId) {
  const spec = APP_PREFIXES.find((a) => a.id === appId);
  return backups.find((b) => b.name.startsWith(spec.prefix) && b.name.endsWith(spec.ext));
}

function parsePayrollBackupCounts(sql) {
  const counts = {};
  for (const m of sql.matchAll(/^-- ([a-z_]+): (\d+) row\(s\)/gm)) {
    counts[m[1]] = Number(m[2]);
  }
  return counts;
}

function countSqlInserts(sql, insertInto) {
  const re = new RegExp(`INSERT INTO ${insertInto.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "g");
  return (sql.match(re) || []).length;
}

async function verifySqlApp(appId, opts) {
  const { tableSpecs, header, prodUrl, backup } = opts;
  const downloaded = await downloadSharePointBackup(backup.id);
  const sql = downloaded.content.toString("utf8");
  if (!sql.includes(header)) throw new Error(`Missing backup header ${header}`);

  const dbName = `verify_${appId}`;
  await recreateDb(dbName);
  const url = tempBaseUrl(dbName);
  await applySchema(appId, url);

  const temp = new Client({ connectionString: url });
  await temp.connect();
  await temp.query(sql);
  const restoredFp = await schemaFingerprint(temp, tableSpecs);
  await temp.end();

  const expectedCounts = {};
  if (appId === "payroll") {
    Object.assign(expectedCounts, parsePayrollBackupCounts(sql));
  }
  for (const spec of tableSpecs) {
    if (expectedCounts[spec.name] == null) {
      expectedCounts[spec.name] = countSqlInserts(sql, spec.insertInto);
    }
  }

  const temp2 = new Client({ connectionString: url });
  await temp2.connect();
  const mismatches = [];
  for (const spec of tableSpecs) {
    const res = await temp2.query(`SELECT count(*)::int AS c FROM ${spec.qualified}`);
    const actual = res.rows[0]?.c ?? 0;
    const expected = expectedCounts[spec.name] ?? 0;
    if (actual !== expected) mismatches.push(`${spec.name}: backup expects ${expected}, restored ${actual}`);
  }
  await temp2.end();

  let prodMatch = null;
  if (prodUrl) {
    const prod = new Client({ connectionString: prodUrl });
    await prod.connect();
    const prodFp = await schemaFingerprint(prod, tableSpecs);
    await prod.end();
    prodMatch = prodFp === restoredFp;
  }

  return {
    backupFile: downloaded.name,
    restoreOk: mismatches.length === 0,
    mismatches,
    matchesProduction: prodMatch,
    mode: "isolated-database",
  };
}

async function verifyHrApp(backup, prodUrl) {
  const downloaded = await downloadSharePointBackup(backup.id);
  const zip = await JSZip.loadAsync(downloaded.content);
  const database = JSON.parse(await zip.file("database.json").async("string"));
  const manifest = JSON.parse(await zip.file("manifest.json").async("string"));
  const indexFile = zip.file("blobs/index.json");
  const blobIndex = indexFile ? JSON.parse(await indexFile.async("string")) : [];

  const archiveErrors = [];
  if (manifest.app && manifest.app !== "team-hr") archiveErrors.push("wrong app in manifest");
  if (manifest.version !== 2) archiveErrors.push(`unsupported version ${manifest.version}`);
  for (const item of blobIndex) {
    if (!zip.file(item.zipPath)) archiveErrors.push(`missing blob ${item.zipPath}`);
  }

  if (archiveErrors.length > 0) {
    return {
      backupFile: downloaded.name,
      restoreOk: false,
      mismatches: archiveErrors,
      blobEntries: blobIndex.length,
      manifestVersion: manifest.version,
      mode: "isolated-database",
    };
  }

  const dbName = "verify_hr";
  await recreateDb(dbName);
  const url = tempBaseUrl(dbName);
  process.env.DATABASE_URL = url;
  await applySchema("hr", url);

  await restoreHrDatabase(database);

  const setup = new Client({ connectionString: url });
  await setup.connect();
  const hrTables = await listTables(setup, "hr");
  await setup.end();
  const tableSpecs = hrTables.map((name) => ({
    name,
    qualified: `hr.${name}`,
    insertInto: `hr.${name}`,
  }));

  const temp = new Client({ connectionString: url });
  await temp.connect();
  const restoredFp = await schemaFingerprint(temp, tableSpecs);
  await temp.end();

  const expectedCounts = {};
  for (const table of Object.keys(database.data ?? {})) {
    expectedCounts[table] = Array.isArray(database.data[table]) ? database.data[table].length : 0;
  }

  const temp2 = new Client({ connectionString: url });
  await temp2.connect();
  const mismatches = [];
  for (const table of hrTables) {
    const res = await temp2.query(`SELECT count(*)::int AS c FROM hr.${table}`);
    const actual = res.rows[0]?.c ?? 0;
    const expected = expectedCounts[table] ?? 0;
    if (actual !== expected) mismatches.push(`${table}: backup expects ${expected}, restored ${actual}`);
  }
  await temp2.end();

  let prodMatch = null;
  if (prodUrl) {
    const prod = new Client({ connectionString: prodUrl });
    await prod.connect();
    const prodTables = await listTables(prod, "hr");
    const prodSpecs = prodTables.map((name) => ({ name, qualified: `hr.${name}`, insertInto: `hr.${name}` }));
    const prodFp = await schemaFingerprint(prod, prodSpecs);
    await prod.end();
    prodMatch = prodFp === restoredFp;
  }

  return {
    backupFile: downloaded.name,
    restoreOk: mismatches.length === 0,
    mismatches,
    blobEntries: blobIndex.length,
    manifestVersion: manifest.version,
    matchesProduction: prodMatch,
    mode: "isolated-database",
  };
}

async function verifyVocApp(backup) {
  const downloaded = await downloadSharePointBackup(backup.id);

  const url = tempBaseUrl("verify_voc");
  await recreateDb("verify_voc");
  await applySchema("voc", url);

  const zipPath = join(tmpdir(), `voc-backup-${Date.now()}.zip`);
  writeFileSync(zipPath, downloaded.content);

  const helper = `
process.env.RAG_DATABASE_URL = ${JSON.stringify(url)};
process.env.DATABASE_URL = process.env.RAG_DATABASE_URL;
const { readFileSync } = await import("node:fs");
const { restoreRagBackupFromZip } = await import("./src/lib/rag-backup.ts");
const { getSql } = await import("./src/lib/db.ts");
const zip = readFileSync(${JSON.stringify(zipPath)});
await restoreRagBackupFromZip(zip, { restoredBy: "verify-script" });
const sql = getSql();
const [counts] = await sql\`
  SELECT
    (SELECT count(*)::int FROM documents) AS documents,
    (SELECT count(*)::int FROM chunks) AS chunks,
    (SELECT count(*)::int FROM notes) AS notes,
    (SELECT count(*)::int FROM terminology) AS terminology,
    (SELECT count(*)::int FROM excluded_urls) AS excluded_urls,
    (SELECT count(*)::int FROM ingest_runs) AS ingest_runs,
    (SELECT count(*)::int FROM document_files) AS document_files
\`;
await sql.end();
console.log(JSON.stringify(counts));
`;

  const helperPath = join(TEAM, "VOCHotline/apps/internal/.verify-voc-restore.mjs");
  writeFileSync(helperPath, helper);
  const out = execSync("npx tsx .verify-voc-restore.mjs", {
    cwd: join(TEAM, "VOCHotline/apps/internal"),
    encoding: "utf8",
    env: {
      ...process.env,
      RAG_DATABASE_URL: url,
      DATABASE_URL: url,
      BLOB_READ_WRITE_TOKEN: "",
      BLOB_PRIVATE_READ_WRITE_TOKEN: "",
    },
  });
  const counts = JSON.parse(out.trim().split("\n").pop());

  const zip = await JSZip.loadAsync(downloaded.content);
  const manifest = JSON.parse(await zip.file("manifest.json").async("string"));
  const expected = manifest.counts;

  const mismatches = [];
  for (const key of Object.keys(expected)) {
    const dbKey =
      key === "excludedUrls" ? "excluded_urls" : key === "ingestRuns" ? "ingest_runs" : key === "documentFiles" ? "document_files" : key;
    const actual = Number(counts[dbKey] ?? counts[key] ?? 0);
    if (actual !== expected[key]) {
      mismatches.push(`${key}: backup expects ${expected[key]}, restored ${actual}`);
    }
  }

  return {
    backupFile: downloaded.name,
    restoreOk: mismatches.length === 0,
    mismatches,
    includeFileOriginals: manifest.includeFileOriginals,
    matchesProduction: null,
    mode: "isolated-database",
  };
}

function sqlTableSpecs(appId, tables) {
  if (appId === "dashboard") {
    return tables.map((name) => ({
      name,
      qualified: `public."${name}"`,
      insertInto: `public."${name}"`,
    }));
  }
  if (appId === "requests") {
    return tables.map((name) => ({ name, qualified: name, insertInto: name }));
  }
  return tables.map((name) => ({
    name,
    qualified: `payroll."${name}"`,
    insertInto: `payroll."${name}"`,
  }));
}

async function main() {
  console.log("Starting isolated Postgres for backup verification...");
  ensureDocker();

  const backups = await listSharePointBackups();
  console.log(`Found ${backups.length} file(s) in SharePoint Backups folder.\n`);

  const dashboardTables = [
    "User",
    "Update",
    "KeyDate",
    "KeyDateBadgeSettings",
    "UpdateBadgeSettings",
    "TickerSettings",
    "TickerItem",
    "BirthdayEntry",
    "ReminderSettings",
    "ReminderRecipient",
    "PageVisit",
    "PhoneBookEntry",
    "PopupMessage",
    "PopupSettings",
    "PopupDismissal",
  ];

  const requestsTables = [
    "app_access_emails",
    "categories",
    "tickets",
    "ticket_comments",
    "ticket_events",
    "app_settings",
    "ticket_attachments",
  ];

  const payrollTables = [
    "employees",
    "app_kv",
    "app_access_emails",
    "leave_change_batches",
    "leave_change_batch_details",
    "pto_log",
    "sick_time_log",
    "pay_stub_batches",
    "pay_stubs",
    "pay_stub_download_log",
  ];

  const specs = [
    {
      id: "dashboard",
      label: "Dashboard",
      run: () =>
        verifySqlApp("dashboard", {
          tableSpecs: sqlTableSpecs("dashboard", dashboardTables),
          header: "-- TEAMVOC_DB_BACKUP_V1",
          prodUrl: dbUrl(appEnv.dashboard),
          backup: latestBackupForApp(backups, "dashboard"),
        }),
    },
    {
      id: "requests",
      label: "Requests",
      run: () =>
        verifySqlApp("requests", {
          tableSpecs: sqlTableSpecs("requests", requestsTables),
          header: "-- TEAM_REQUESTS_DB_BACKUP_V1",
          prodUrl: dbUrl(appEnv.requests),
          backup: latestBackupForApp(backups, "requests"),
        }),
    },
    {
      id: "payroll",
      label: "Payroll",
      run: () =>
        verifySqlApp("payroll", {
          tableSpecs: sqlTableSpecs("payroll", payrollTables),
          header: "-- TEAM_PAYROLL_DB_BACKUP_V1",
          prodUrl: dbUrl(appEnv.payroll),
          backup: latestBackupForApp(backups, "payroll"),
        }),
    },
    {
      id: "hr",
      label: "HR",
      run: () => verifyHrApp(latestBackupForApp(backups, "hr"), dbUrl(appEnv.hr)),
    },
    {
      id: "voc",
      label: "Voc hotline",
      run: () => verifyVocApp(latestBackupForApp(backups, "voc")),
    },
  ];

  const onlyArg = process.argv.find((a) => a.startsWith("--only="));
  const onlyIds = onlyArg ? new Set(onlyArg.slice("--only=".length).split(",")) : null;

  const results = [];

  for (const spec of specs) {
    if (onlyIds && !onlyIds.has(spec.id)) continue;
    process.stdout.write(`Testing ${spec.label}... `);
    const backup = latestBackupForApp(backups, spec.id);
    if (!backup) {
      console.log("SKIP (no SharePoint backup found)");
      results.push({ app: spec.label, status: "skip", reason: "no backup file" });
      continue;
    }

    try {
      const result = await spec.run();
      const ok = result.restoreOk;
      console.log(ok ? "PASS" : "FAIL");
      results.push({ app: spec.label, status: ok ? "pass" : "fail", ...result });
    } catch (err) {
      console.log("ERROR");
      results.push({
        app: spec.label,
        status: "error",
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  console.log("\n=== Backup verification summary ===\n");
  for (const r of results) {
    console.log(`${r.app}: ${r.status.toUpperCase()}`);
    if (r.backupFile) console.log(`  file: ${r.backupFile}`);
    if (r.restoreOk === false && r.mismatches?.length) {
      for (const m of r.mismatches) console.log(`  - ${m}`);
    }
    if (r.matchesProduction === true) console.log("  matches current production: yes");
    if (r.matchesProduction === false) {
      console.log("  matches current production: no (backup may predate recent changes)");
    }
    if (r.rowCounts) console.log(`  database rows in archive: ${JSON.stringify(r.rowCounts)}`);
    if (r.counts) console.log(`  archive counts: ${JSON.stringify(r.counts)}`);
    if (r.mode) console.log(`  mode: ${r.mode}`);
    if (r.error) console.log(`  error: ${r.error}`);
    console.log("");
  }

  const failed = results.filter((r) => r.status === "fail" || r.status === "error");
  process.exit(failed.length ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
