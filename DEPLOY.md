# Push to GitHub & Deploy on Vercel

## 1. Fix GitHub CLI (if you use it)

Your GitHub CLI token is invalid. Re-authenticate:

```bash
gh auth login -h github.com
```

Follow the prompts (browser or token).

---

## 2. Create a GitHub repo and push

**Option A – Using GitHub CLI (after `gh auth login`):**

```bash
cd "/Users/ghim/Projects/teamvoc updates"
gh repo create teamvoc-updates --private --source=. --remote=origin --push
```

(Use `--public` if you want a public repo.)

**Option B – Create repo on GitHub, then push:**

1. Go to [github.com/new](https://github.com/new).
2. Repository name: `teamvoc-updates` (or any name).
3. Choose **Private** (or Public). Do **not** add a README, .gitignore, or license.
4. Click **Create repository**.
5. Run (replace `YOUR_USERNAME` and `REPO_NAME` with your repo):

```bash
cd "/Users/ghim/Projects/teamvoc updates"
git remote add origin https://github.com/YOUR_USERNAME/REPO_NAME.git
git push -u origin main
```

If your branch is still `master`, run: `git branch -M main` then `git push -u origin main`.

---

## 3. Deploy on Vercel

1. Go to [vercel.com](https://vercel.com) and sign in (use GitHub if possible).
2. Click **Add New…** → **Project**.
3. **Import** your `teamvoc-updates` repo (or the repo you created).
4. **Configure:**
   - Framework: **Next.js** (auto-detected).
   - Root Directory: leave default.
   - Build Command: `npm run build` (default).
   - Output Directory: leave default.
5. **Environment variables** (add before or right after first deploy):
   - `DATABASE_URL` – from Vercel **Storage** (create a Postgres DB and copy the URL), or your own Postgres connection string.
   - `NEXTAUTH_SECRET` – run `openssl rand -base64 32` and paste the result.
   - `NEXTAUTH_URL` – your Vercel URL, e.g. `https://teamvoc-updates.vercel.app` (Vercel may suggest it).
6. Click **Deploy**. Wait for the build to finish.

---

## 4. Database and admin user (after first deploy)

Vercel does not run your migrations or seed. Do this once from your machine using the **same** `DATABASE_URL` as in Vercel:

1. Copy `DATABASE_URL` from Vercel: **Project → Settings → Environment Variables**, or run:
   ```bash
   npx vercel env pull .env.production
   ```
2. From the project folder:
   ```bash
   cd "/Users/ghim/Projects/teamvoc updates"
   npx prisma db push
   npx prisma db seed
   ```
3. Open your Vercel app URL, sign in with **admin@example.com** / **admin123**, then add your users and change the admin password (e.g. via DB or a future “change password” feature).

---

## 5. Later: push = redeploy

After the first deploy, every push to `main` (e.g. `git push`) will trigger a new Vercel deployment automatically.
