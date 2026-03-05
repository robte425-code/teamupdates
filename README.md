# Teamvoc Updates

A simple website for your team to view **Updates & Reminders** and **Key dates**. Sign-in is via **Microsoft 365** (Azure AD); anyone in your organization can sign in. **Site owners** (configured by email) have admin access to manage content; **members** can only view the home page.

## Features

- **Updates & Reminders** – Date posted, title, and body. Sorted by date (newest first).
- **Key dates** – Event/due date with “days left” (or “due today” / “X days ago”). Title and body.
- **Auth** – Sign in with **Microsoft 365**. Only your organization’s users can sign in (single-tenant Azure AD).
- **Roles**
  - **Site owners** (admins) – Listed in `ADMIN_EMAILS`. Can open **Manage** to add, edit, and delete updates and key dates.
  - **Members** – Everyone else. Can view the home page only.

## Tech stack

- **Next.js 14** (App Router)
- **NextAuth.js** (Azure AD provider, JWT)
- **Prisma** + **PostgreSQL**
- **Tailwind CSS**

## Local setup

### 1. Install dependencies

```bash
npm install
```

### 2. Database

Use any PostgreSQL database (local, [Neon](https://neon.tech), [Supabase](https://supabase.com), or Vercel Postgres/Neon).

Create a `.env` file (see `.env.example`):

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DATABASE?sslmode=require"
NEXTAUTH_SECRET="run: openssl rand -base64 32"
NEXTAUTH_URL="http://localhost:3000"

# Microsoft 365 / Azure AD
AZURE_AD_CLIENT_ID="your-client-id"
AZURE_AD_CLIENT_SECRET="your-client-secret"
AZURE_AD_TENANT_ID="your-tenant-id"
ADMIN_EMAILS="you@yourcompany.com"
```

### 3. Azure AD app registration

1. Go to [Azure Portal](https://portal.azure.com) → **Azure Active Directory** (or **Microsoft Entra ID**) → **App registrations** → **New registration**.
2. Name the app (e.g. “Teamvoc Updates”), choose **Accounts in this organizational directory only**, register.
3. Note **Application (client) ID** and **Directory (tenant) ID**.
4. **Certificates & secrets** → New client secret → copy the **Value** → use as `AZURE_AD_CLIENT_SECRET`.
5. **Authentication** → Add a platform → **Web** → Redirect URI: `http://localhost:3000/api/auth/callback/azure-ad` (and your production URL later).
6. Under **Implicit grant and hybrid flows**, enable **ID tokens** (optional; recommended for OIDC).

### 4. Create tables

```bash
npx prisma db push
```

(No user seed needed; auth is Microsoft 365.)

### 5. Run dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and sign in with **Sign in with Microsoft**. Users whose email is in `ADMIN_EMAILS` will see **Updates** and **Key dates** in the header and can manage content.

## Deploy on Vercel

1. Push to GitHub and import the repo in Vercel.
2. Add **PostgreSQL** (Storage or Neon) and set `DATABASE_URL`.
3. **Environment variables** – set all of:

| Name | Value |
|------|--------|
| `DATABASE_URL` | From Storage / Postgres provider |
| `NEXTAUTH_SECRET` | `openssl rand -base64 32` |
| `NEXTAUTH_URL` | `https://your-app.vercel.app` |
| `AZURE_AD_CLIENT_ID` | From Azure app |
| `AZURE_AD_CLIENT_SECRET` | From Azure app |
| `AZURE_AD_TENANT_ID` | Your tenant ID |
| `ADMIN_EMAILS` | Comma-separated emails of site owners |

4. In Azure, add the production redirect URI: `https://your-app.vercel.app/api/auth/callback/azure-ad`.
5. Deploy, then run once: `npx prisma db push` (using the same `DATABASE_URL` as in Vercel).

## Who has access

- **Sign-in:** Any user in your Azure AD tenant (Microsoft 365 organization) can sign in.
- **Site owners:** Emails listed in `ADMIN_EMAILS` get admin role (Manage updates & key dates).
- **Members:** All other signed-in users are members and can only view the home page.

## Scripts

| Command | Description |
|--------|-------------|
| `npm run dev` | Start dev server |
| `npm run build` | Generate Prisma client + build |
| `npm run start` | Start production server |
| `npx prisma db push` | Sync schema to DB |
| `npx prisma studio` | Open DB GUI |

## License

MIT
