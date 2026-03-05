# Seed production database (create admin user)

Run these from the project root. Use the **same** `DATABASE_URL` as in Vercel (your Neon DB).

## Option A: You have DATABASE_URL in .env

1. Put your **production** Neon URL in `.env`:
   ```
   DATABASE_URL="postgresql://neondb_owner:YOUR_PASSWORD@ep-....-pooler....neon.tech/neondb?sslmode=require"
   ```
2. Run:
   ```bash
   npx prisma db push
   npx prisma db seed
   ```

## Option B: Pull env from Vercel

```bash
npx vercel env pull .env.production
```
Then run (this uses .env.production):
```bash
DATABASE_URL=$(grep DATABASE_URL .env.production | cut -d '=' -f2-) npx prisma db push
DATABASE_URL=$(grep DATABASE_URL .env.production | cut -d '=' -f2-) npx prisma db seed
```
Or copy `DATABASE_URL` from `.env.production` into `.env`, then run `npx prisma db push` and `npx prisma db seed`.

After this, log in with **admin@example.com** / **admin123**.
