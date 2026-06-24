# TEAM credential rotation checklist

Living inventory for secrets that expire or should be rotated on a schedule.  
**Last reviewed:** 2026-06-24 (Entra client secrets + Vercel deploy token verified in portal)

---

## Azure app registrations (SSO vs SharePoint)

### Entra client secrets (expiration dates)

Recorded from **Microsoft Entra ID → App registrations → Certificates & secrets** (June 2026).

| Entra app registration | Expires | Secret ID | Value hint | Vercel / usage |
|------------------------|---------|-----------|------------|----------------|
| **Teamvoc Update** | **2028-03-04** | `05916ac4-4bdd-459a-aae8-5493d2a1ec70` | `_T-…` | Primary SSO — `teamvoc-updates`, `team-requests`, `team-payroll` (`AZURE_AD_*`; confirm client IDs match) |
| **VOC Hotline** | **2028-06-07** | `506a3b7d-3b95-4614-b30f-8a65c3674d80` | `YSZ…` | `voc-hotline-nine` (`AZURE_AD_*`) |
| **Team HR** | **2028-06-16** | `811d5704-b8c4-4e77-aeee-0e28ca1fa577` | `A8w…` | `team-hr` (`AZURE_AD_*`) |
| **TEAM SharePoint backups** | **2028-06-22** | `74103444-6211-4a28-bec3-8ba667db75b3` | `r-L…` | SharePoint Graph for Backup hub uploads (`SHAREPOINT_AZURE_*` and/or `AZURE_AD_*` — confirm per project) |

**Calendar reminders:** 30 days and 7 days before each date above.

**Voc public** (`voc-hotline.org`) does not use Azure AD — it has its own NextAuth + email/2FA.

### How to confirm in Azure Portal

1. Open [Azure Portal](https://portal.azure.com) → **Microsoft Entra ID** → **App registrations**.
2. Open each app above → **Certificates & secrets** → match **Secret ID** and **Expires** to this table after any rotation.
3. In Vercel → each project → **Environment Variables** → confirm **`AZURE_AD_CLIENT_ID`** (and optional **`SHAREPOINT_AZURE_CLIENT_ID`**) matches the intended registration.
4. On the SharePoint backup app → **API permissions** → confirm **Application** permissions include **Sites.ReadWrite.All** and **Files.ReadWrite.All**.

### Per-project Azure env (verify after changes)

| Vercel project | SSO app (typical) | SharePoint Graph |
|----------------|-------------------|------------------|
| `teamvoc-updates` | Teamvoc Update | TEAM SharePoint backups or same as SSO — verify env |
| `team-requests` | Teamvoc Update | Same as Updates — verify env |
| `team-payroll` | Teamvoc Update | Optional `SHAREPOINT_AZURE_*` — verify env |
| `team-hr` | Team HR | Verify env |
| `voc-hotline-nine` (internal) | VOC Hotline | Optional `SHAREPOINT_AZURE_*` — verify env |

Payroll and Voc internal code supports **`SHAREPOINT_AZURE_CLIENT_ID` / `SECRET` / `TENANT_ID`** so Graph can use a different app than login. Compare Vercel production values to the **TEAM SharePoint backups** registration when rotating backup credentials.

---

## Vercel deploy tokens (GitHub Actions)

Recorded from [vercel.com/account/tokens](https://vercel.com/account/tokens) (June 2026).  
GitHub repo secrets only store the token value — **expiry is visible in Vercel**, not on the GitHub secrets page.

| Vercel token name | Created | Expires | GitHub secret | Repo / usage |
|-------------------|---------|---------|---------------|--------------|
| **GitHub Actions teamupdates** | 2026-03-27 | **Never expires** | `VERCEL_TOKEN` | `robte425-code/teamupdates` — **Deploy to Vercel** + credential expiry report |
| *(voc-hotline deploy — verify)* | — | — | `VERCEL_TOKEN` | Check `voc-hotline` repo if separate token exists |

**Not the GitHub deploy token:** local **Vercel CLI** sessions (e.g. “Vercel CLI from MacBookPro”) can show a short expiry (e.g. 2026-06-24) — those are for `vercel` on your machine only.

**Policy:** `VERCEL_TOKEN` for GitHub has no vendor expiry today. Rotate **every 12 months** anyway, or **set an expiration** when you create the next token (then update the GitHub secret before the old token is revoked).

**Where to update:** GitHub → repo → **Settings → Secrets and variables → Actions** → `VERCEL_TOKEN`.  
Also on `teamupdates`: `VERCEL_ORG_ID` and `VERCEL_PROJECT_ID` (IDs — they do not expire).

**Legacy GitHub secrets on `teamupdates` (not used by current workflows):** `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET`, `AZURE_TENANT_ID`, `DATABASE_URL`, `ONEDRIVE_USER_UPN` — review and remove if nothing else references them.

---

## Calendar: credentials with vendor expiration dates

| Credential | Apps | Expires (next) | Where to see expiration | Calendar action |
|------------|------|----------------|-------------------------|-----------------|
| **`AZURE_AD_CLIENT_SECRET`** (Teamvoc Update) | Updates, Requests, Payroll | **2028-03-04** | Entra → *Teamvoc Update* → **Certificates & secrets** | Reminder 30 + 7 days before; update all three Vercel projects together |
| **`AZURE_AD_CLIENT_SECRET`** (VOC Hotline) | Voc internal | **2028-06-07** | Entra → *VOC Hotline* | Reminder 30 + 7 days before; update `voc-hotline-nine` |
| **`AZURE_AD_CLIENT_SECRET`** (Team HR) | HR | **2028-06-16** | Entra → *Team HR* | Reminder 30 + 7 days before; update `team-hr` |
| **SharePoint client secret** (TEAM SharePoint backups) | Backup hub (all apps that upload) | **2028-06-22** | Entra → *TEAM SharePoint backups* | Reminder 30 + 7 days before; update `SHAREPOINT_AZURE_*` (or `AZURE_AD_*` if shared) on each project that uploads |
| **`VERCEL_TOKEN`** (GitHub Actions teamupdates) | `teamupdates` deploy + expiry report | **No vendor expiry** (created 2026-03-27) | [vercel.com/account/tokens](https://vercel.com/account/tokens) | Rotate on policy (~12 months) or set expiry on next token; update GitHub secret |

**Entra alerts:** Enable **Identity → Recommendations → Renew expiring application credentials**. There is no built-in email for app secret expiry — consider a monthly PowerShell/Logic App check.

---

## Calendar: rotate on schedule (no auto-expiry in vendor UI)

Suggested: **every 6–12 months** (pick fixed dates, e.g. Jan 1 and Jul 1).

| Credential | Apps | Console |
|------------|------|---------|
| `NEON_API_KEY` | Updates (Backup hub) | [Neon → Account settings → API keys](https://console.neon.tech/app/settings/api-keys) |
| `POSTMARK_SERVER_TOKEN` | Requests, Voc public | Postmark → Server → **API Tokens** |
| `RESEND_API_KEY` | Updates | [Resend → API Keys](https://resend.com/api-keys) |
| `ANTHROPIC_API_KEY` | Voc internal, Voc public | [Anthropic Console](https://console.anthropic.com) |
| `VOYAGE_API_KEY` | Voc internal, Voc public | [Voyage dashboard](https://dashboard.voyageai.com) |
| `GOOGLE_CLOUD_VISION_API_KEY` | Voc internal | GCP → **APIs & Services → Credentials** |
| `STRIPE_SECRET_KEY` | Voc public | Stripe → **Developers → API keys** |
| `STRIPE_WEBHOOK_SECRET` | Voc public | Stripe → **Developers → Webhooks** → endpoint → roll with 24h overlap |
| `BAMBOOHR_API_KEY` | HR (optional) | BambooHR → profile → API Keys |
| `FRESHDESK_API_KEY` | Requests (import script only) | Freshdesk → profile |

---

## Self-managed secrets (no vendor expiry — rotate on policy)

| Credential | Must match across | Notes |
|------------|-------------------|--------|
| `TEAM_INTERNAL_ACCESS_SECRET` | **All** TEAM Vercel projects | Backup hub internal APIs; update every project same day |
| `NEXTAUTH_SECRET` | Per app (each project has its own) | Rotating logs users out |
| `CRON_SECRET` | Per app that uses cron | Updates, Requests, Voc internal, Voc public |
| `TOTP_ENCRYPTION_KEY` | Voc public only | **Do not rotate** without a migration plan |

Generate: `openssl rand -base64 32`

---

## Rotation runbooks

### Azure client secret (per Entra app registration)

Each app has its **own** secret and expiry — see the table at the top of this doc. Rotate one registration at a time:

1. Entra → that app registration → **Certificates & secrets** → **New client secret** (update this doc with new **Expires** and **Secret ID**).
2. Update the matching Vercel env var(s):
   - **Teamvoc Update** → `AZURE_AD_CLIENT_SECRET` on `teamvoc-updates`, `team-requests`, `team-payroll`
   - **VOC Hotline** → `AZURE_AD_CLIENT_SECRET` on `voc-hotline-nine`
   - **Team HR** → `AZURE_AD_CLIENT_SECRET` on `team-hr`
   - **TEAM SharePoint backups** → `SHAREPOINT_AZURE_CLIENT_SECRET` (or `AZURE_AD_CLIENT_SECRET` if that project uses the backup app for Graph) on every project that uploads to SharePoint
3. Redeploy affected project(s).
4. Test sign-in on each affected app; run **Backup all** from Backup hub after SharePoint secret changes.
5. Delete the **old** secret in Entra.

### `TEAM_INTERNAL_ACCESS_SECRET`

1. Generate new value.
2. Update on **all** Vercel projects in one session.
3. Redeploy; test Backup hub backup + restore dry-run.

### API keys (Neon, Postmark, Anthropic, etc.)

1. Create **new** key in vendor console.
2. Update Vercel env var(s).
3. Redeploy affected project(s).
4. Verify (send test email, run Voc query, refresh Neon panel).
5. Revoke **old** key.

### Stripe webhook secret

1. Stripe Dashboard → Webhook → **Roll secret** → choose **24-hour overlap**.
2. Update `STRIPE_WEBHOOK_SECRET` on Voc public Vercel project.
3. Confirm webhook deliveries succeed.
4. Let old secret expire after overlap.

### `VERCEL_TOKEN` (GitHub Actions)

1. [vercel.com/account/tokens](https://vercel.com/account/tokens) → create new token (name e.g. `GitHub Actions teamupdates`) — **set an expiration** if possible.
2. GitHub → `teamupdates` → **Settings → Secrets and variables → Actions** → update `VERCEL_TOKEN`.
3. Repeat for `voc-hotline` repo if it uses a separate token.
4. Run **Deploy to Vercel** workflow once; confirm production deploy succeeds.
5. Revoke the old token in Vercel.
6. Update the **Vercel deploy tokens** table in this doc (created date, expiry).

---

## Per-app secret map

| App | Vercel project | Expiring / rotatable |
|-----|----------------|----------------------|
| **Updates (Dashboard)** | `teamvoc-updates` | Azure SSO+Graph, Resend, Neon API, TEAM internal, CRON, SharePoint URL |
| **Requests** | `team-requests` | Azure SSO+Graph, Postmark, TEAM internal, CRON |
| **Payroll** | `team-payroll` | Azure SSO+Graph, TEAM internal |
| **HR** | `team-hr` | Azure SSO+Graph, TEAM internal, Blob token (Vercel-injected) |
| **Voc internal** | `voc-hotline-nine` | Azure SSO+Graph, Anthropic, Voyage, Google Vision, TEAM internal, CRON |
| **Voc public** | *(separate Vercel project if deployed)* | Anthropic, Voyage, Postmark, Stripe, CRON — **no Azure** |

---

## Quick verification commands

List Azure-related env **names** on Vercel (no values):

```bash
npx vercel env ls production --scope robert-evans-projects-bb7ab988 | rg -i 'AZURE|SHAREPOINT'
```

Compare client ID across projects in Vercel UI — **`AZURE_AD_CLIENT_ID`** should match the Entra app for that project (Teamvoc Update, VOC Hotline, or Team HR). SharePoint uploads may use **TEAM SharePoint backups** via `SHAREPOINT_AZURE_*`.

---

## Automated expiry report

Script: **`scripts/credential-expiry-report.mjs`**  
Registry (policy reminders): **`scripts/credential-expiry-registry.json`**  
GitHub Action: **`.github/workflows/credential-expiry-report.yml`** (1st of each month + manual run)

### What it auto-discovers

| Source | Credentials | Requires |
|--------|-------------|----------|
| Microsoft Graph | `AZURE_AD_CLIENT_SECRET` expiry (+ certs if any) | Graph reader app (below) + `AZURE_APP_CLIENT_ID` |
| Vercel API | Deploy token `expiresAt` | `VERCEL_TOKEN` |
| Local registry | Neon, Postmark, Anthropic, etc. | Set `lastRotated` after each rotation |

### One-time setup: Graph reader app (step-by-step)

Your **SSO app** cannot read its own secret expiry via Graph unless it has **Application.Read.All** — which you usually do *not* want on a sign-in app. Create a dedicated **automation** registration instead.

#### 1. Create the app

1. Sign in to [Azure Portal](https://portal.azure.com) as a tenant admin.
2. **Microsoft Entra ID** → **App registrations** → **New registration**.
3. **Name:** `TEAM credential monitor` (any name is fine).
4. **Supported account types:** *Accounts in this organizational directory only*.
5. **Redirect URI:** leave blank → **Register**.

Copy these from the app **Overview** page (you will need them for GitHub secrets):

| Value | GitHub secret |
|-------|----------------|
| **Application (client) ID** | `AZURE_GRAPH_CLIENT_ID` |
| **Directory (tenant) ID** | `AZURE_GRAPH_TENANT_ID` |

#### 2. Grant Graph permission

1. On the new app → **API permissions** → **Add a permission**.
2. **Microsoft Graph** → **Application permissions** (not Delegated).
3. Search **Application.Read.All** → check it → **Add permissions**.
4. Click **Grant admin consent for [your tenant]** → **Yes**.
5. Confirm the row shows a green check under **Status**.

Without admin consent, the script returns *Insufficient privileges*.

#### 3. Create the automation app secret

1. **Certificates & secrets** → **Client secrets** → **New client secret**.
2. Description: `GitHub credential report`.
3. Expires: **24 months** (set a calendar reminder for this secret too).
4. **Add** → copy the **Value** immediately (shown once) → GitHub secret **`AZURE_GRAPH_CLIENT_SECRET`**.

#### 4. Identify the SSO app to inspect

1. **App registrations** → open your existing TEAM SSO app (e.g. *Teamvoc Updates*).
2. Copy **Application (client) ID** → GitHub secret **`AZURE_APP_CLIENT_ID`**.

This must match production **`AZURE_AD_CLIENT_ID`** on all five Vercel projects.

#### 5. Add GitHub secrets (`robte425-code/teamupdates`)

**Settings → Secrets and variables → Actions → New repository secret:**

| Secret | Value |
|--------|--------|
| `AZURE_GRAPH_CLIENT_ID` | Credential monitor app client ID |
| `AZURE_GRAPH_CLIENT_SECRET` | Monitor app secret (step 3) |
| `AZURE_GRAPH_TENANT_ID` | Tenant ID |
| `AZURE_APP_CLIENT_ID` | TEAM SSO app client ID |
| `VERCEL_TOKEN` | *(optional)* Vercel token that can call `/v5/user/tokens` |
| `RESEND_API_KEY` | *(optional)* same Resend key as Updates production |
| `CREDENTIAL_ALERT_TO` | *(optional)* e.g. `you@team-voc.com,ops@team-voc.com` |
| `EMAIL_FROM` | *(optional)* verified Resend From, e.g. `TEAM Dashboard <noreply@team-voc.com>` |
| `SLACK_WEBHOOK_URL` | *(optional)* Slack incoming webhook URL |

For local runs, add the same vars to `.env` (see `.env.example`).

#### 6. Verify Graph access

After saving secrets, run the workflow manually (**Actions → Credential expiry report → Run workflow**), or locally:

```bash
# Add AZURE_GRAPH_* and AZURE_APP_CLIENT_ID to .env first
node scripts/credential-expiry-report.mjs --json | node -e "
  const d=require('fs').readFileSync(0,'utf8'); const j=JSON.parse(d);
  console.log('Azure error:', j.errors.azure || '(none)');
  console.log('Secrets found:', j.items.filter(i=>i.source==='azure').length);
  j.items.filter(i=>i.source==='azure').forEach(i=>
    console.log(' -', i.name, i.expiresLabel, '('+i.daysUntil+'d)'));
"
```

**Expected:** `Azure error: (none)` and at least one row for `AZURE_AD_CLIENT_SECRET` with an expiry date.

**If you see *Insufficient privileges*:** admin consent was not granted on **Application.Read.All**, or the wrong tenant ID was used.

**If you see *No app registration found*:** `AZURE_APP_CLIENT_ID` does not match the SSO app’s client ID.

### Run locally

```bash
node scripts/credential-expiry-report.mjs
node scripts/credential-expiry-report.mjs --json --out /tmp/expiry.json
node scripts/credential-expiry-report.mjs --days 60 --out credential-expiry-report.md
node scripts/credential-expiry-report.mjs --days 60 --notify          # email/Slack if within threshold
node scripts/credential-expiry-report.mjs --days 60 --notify-always   # always send monthly summary
```

### Email and Slack alerts

The workflow runs with **`--notify`**. Alerts fire when any credential is **expired**, **critical** (≤7 days), **warning** (≤30 days), or **within the `--days` window** (default 60).

| Channel | Env / secret | Notes |
|---------|--------------|--------|
| Email | `RESEND_API_KEY` + `CREDENTIAL_ALERT_TO` | Uses Resend HTTP API (no npm install). `EMAIL_FROM` must be a verified domain. |
| Slack | `SLACK_WEBHOOK_URL` | Optional; same message as email. Create at [Slack API → Incoming Webhooks](https://api.slack.com/messaging/webhooks). |

If nothing is within threshold, **no email/Slack is sent** (artifact still uploaded). Use **`--notify-always`** for a monthly “all clear” message.

Test locally:

```bash
CREDENTIAL_ALERT_TO="you@team-voc.com" RESEND_API_KEY="re_..." \
  node scripts/credential-expiry-report.mjs --days 365 --notify-always
```

### After rotating a policy credential

Edit `scripts/credential-expiry-registry.json` and set `"lastRotated": "YYYY-MM-DD"` for that entry so the next due date is computed automatically.

### GitHub Action output

Each run uploads **`credential-expiry-report.md`** as a workflow artifact (Actions → Credential expiry report → Artifacts). Email/Slack fire automatically when credentials need attention (see above).
