# TEAM credential rotation checklist

Living inventory for secrets that expire or should be rotated on a schedule.  
**Last reviewed:** 2026-06-24

---

## Azure app registrations (SSO vs SharePoint)

### Production today: **one registration**

Vercel production env for all five staff apps lists **`AZURE_AD_CLIENT_ID`**, **`AZURE_AD_CLIENT_SECRET`**, **`AZURE_AD_TENANT_ID`**, and **`SHAREPOINT_SITE_URL`** only.  
**No project has `SHAREPOINT_AZURE_*` set**, so SharePoint Graph uses the same app as staff sign-in.

| Vercel project | SSO (`AZURE_AD_*`) | SharePoint Graph |
|----------------|-------------------|------------------|
| `teamvoc-updates` | Yes | Same `AZURE_AD_*` |
| `team-requests` | Yes | Same `AZURE_AD_*` |
| `team-payroll` | Yes | Falls back to `AZURE_AD_*` (optional `SHAREPOINT_AZURE_*` not set) |
| `team-hr` | Yes | Same `AZURE_AD_*` |
| `voc-hotline-nine` (internal) | Yes | Falls back to `AZURE_AD_*` (optional `SHAREPOINT_AZURE_*` not set) |

**Voc public** (`voc-hotline.org`) does not use Azure AD — it has its own NextAuth + email/2FA.

### How to confirm in Azure Portal

1. Open [Azure Portal](https://portal.azure.com) → **Microsoft Entra ID** → **App registrations**.
2. You should see **one primary TEAM app** (often named like *Teamvoc Updates*). Its **Application (client) ID** should match `AZURE_AD_CLIENT_ID` in any Vercel project (compare in Vercel → Project → Settings → Environment Variables — client ID is safe to view).
3. Check for a **second** registration only if you intentionally split Graph from SSO. If none exists, you have one app.
4. On that app → **Certificates & secrets** → note each secret’s **Expires** date for your calendar.
5. On that app → **API permissions** → confirm **Application** permissions include **Sites.ReadWrite.All** and **Files.ReadWrite.All** (required for Backup hub SharePoint uploads).

### Optional second registration (code only, not in prod)

Payroll and Voc internal support **`SHAREPOINT_AZURE_CLIENT_ID` / `SECRET` / `TENANT_ID`** so Graph can use a different app than login (useful if the sign-in app must not hold SharePoint permissions). This is documented in their `.env.example` but **not configured on Vercel today**.

---

## Calendar: credentials with vendor expiration dates

| Credential | Apps | Where to see expiration | Calendar action |
|------------|------|-------------------------|-----------------|
| **`AZURE_AD_CLIENT_SECRET`** | Updates, Requests, Payroll, HR, Voc internal | Entra → App registrations → *[TEAM app]* → **Certificates & secrets** → **Expires** | Reminder 30 + 7 days before; rotate all five Vercel projects together |
| **`VERCEL_TOKEN`** | GitHub Actions: `teamupdates`, `voc-hotline` deploy workflows | [vercel.com/account/tokens](https://vercel.com/account/tokens) | Set expiry when creating; reminder before GitHub secret update |

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

### Azure client secret (one app, five Vercel projects)

1. Entra → App registration → **Certificates & secrets** → **New client secret** (note new **Expires** in calendar).
2. Update **`AZURE_AD_CLIENT_SECRET`** on: `teamvoc-updates`, `team-requests`, `team-payroll`, `team-hr`, `voc-hotline-nine`.
3. Redeploy all five (or push empty commit / redeploy from Vercel).
4. Test sign-in on each app + run **Backup all** from Backup hub.
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

1. Create new token at vercel.com → Account Settings → Tokens (**set expiration**).
2. Update GitHub repo secret `VERCEL_TOKEN` for `teamupdates` and/or `voc-hotline`.
3. Run deploy workflow once.
4. Revoke old token.

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

Compare client ID across projects in Vercel UI — all `AZURE_AD_CLIENT_ID` values should be identical if using one registration.

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
