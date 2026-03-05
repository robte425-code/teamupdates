# Teamvoc Updates

A simple website for ~20 users to view **Updates & Reminders** and **Key dates**, with an admin who can add/edit/delete items and manage users. Built for deployment on [Vercel](https://vercel.com).

## Features

- **Updates & Reminders** – Date posted, title, and body. Sorted by date (newest first).
- **Key dates** – Event/due date with “days left” (or “due today” / “X days ago”). Title and body.
- **Auth** – Sign in with email and password. Only invited users (in the database) can log in.
- **Admin** – One or more admin users can:
  - Add, edit, and delete updates and key dates
  - Add new users (members or admins) so they can log in

## Tech stack

- **Next.js 14** (App Router)
- **NextAuth.js** (credentials provider, JWT)
- **Prisma** + **PostgreSQL**
- **Tailwind CSS**

## Local setup

### 1. Install dependencies

```bash
npm install
```

### 2. Database

Use any PostgreSQL database (local, [Neon](https://neon.tech), [Supabase](https://supabase.com), or Vercel Postgres/Neon via Vercel dashboard).

Create a `.env` file (see `.env.example`):

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DATABASE?sslmode=require"
NEXTAUTH_SECRET="run: openssl rand -base64 32"
NEXTAUTH_URL="http://localhost:3000"
```

### 3. Create tables and seed admin

```bash
npx prisma db push
npx prisma db seed
```

This creates the schema and an **admin user**:

- **Email:** `admin@example.com`
- **Password:** `admin123`

Change this password after first login (e.g. by updating the user in the database or adding a “change password” feature later).

### 4. Run dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), sign in with the admin account, then:

- Add more users (admin or member) in the “Manage users” section.
- Add updates and key dates.

## Deploy on Vercel

### 1. Push code to GitHub

Create a repo and push this project.

### 2. Import on Vercel

1. Go to [vercel.com](https://vercel.com) and sign in.
2. **Add New** → **Project** → import your GitHub repo.
3. **Configure:**
   - Framework: Next.js (auto-detected).
   - Root directory: leave default.
   - Build command: `npm run build` (uses `prisma generate` from `package.json`).

### 3. Add PostgreSQL

- In the Vercel project: **Storage** tab → create a **Postgres** database (or connect an existing one from the marketplace, e.g. Neon).
- Vercel will add `DATABASE_URL` (and related vars) to the project.

### 4. Environment variables

In the project **Settings** → **Environment Variables**, add:

| Name             | Value                                                                 | Environments   |
|------------------|-----------------------------------------------------------------------|----------------|
| `DATABASE_URL`   | (from Storage / your Postgres provider)                               | All            |
| `NEXTAUTH_SECRET`| Generate: `openssl rand -base64 32`                                  | Production, Preview |
| `NEXTAUTH_URL`   | Your deployment URL, e.g. `https://your-project.vercel.app`          | Production     |

For preview deployments you can set `NEXTAUTH_URL` to the preview URL or leave it and override per deployment if needed.

### 5. Deploy and run migrations

1. **Deploy** the project.
2. After first deploy, run migrations and seed from your machine (or from a one-off script):

   ```bash
   # Use the same DATABASE_URL as in Vercel (copy from env or use Vercel CLI)
   npx prisma db push
   npx prisma db seed
   ```

   Or use **Vercel CLI**: `vercel env pull .env.production`, then run the same commands with that env.

3. Open your Vercel URL, sign in with `admin@example.com` / `admin123`, then change the admin password (e.g. via DB) and add your ~20 users via “Manage users”.

## Adding more users

- **As admin:** Sign in → scroll to “Manage users” → use “Add user” (email, optional name, password, role: member or admin).
- **Manually:** Use [Prisma Studio](https://www.prisma.io/studio) (`npx prisma studio`) or any SQL client. Insert into `User` with a **bcrypt-hashed** password and `role` = `member` or `admin`.

## Scripts

| Command        | Description                    |
|----------------|--------------------------------|
| `npm run dev`  | Start dev server               |
| `npm run build`| Generate Prisma client + build |
| `npm run start`| Start production server        |
| `npx prisma db push` | Sync schema to DB        |
| `npx prisma db seed` | Seed admin user          |
| `npx prisma studio`  | Open DB GUI             |

## License

MIT
