#!/usr/bin/env bash
# Seed the production DB (same one Vercel uses). Run from project root.
set -e
cd "$(dirname "$0")/.."

if [ -z "$DATABASE_URL" ]; then
  if [ -f .env ]; then
    echo "Loading from .env..."
    set -a
    source .env
    set +a
  elif [ -f .env.production ]; then
    echo "Loading from .env.production..."
    set -a
    source .env.production
    set +a
  fi
fi

if [ -z "$DATABASE_URL" ]; then
  echo "DATABASE_URL is not set."
  echo "Either:"
  echo "  1. Copy DATABASE_URL from Vercel (Project → Settings → Environment Variables) into .env"
  echo "  2. Or run: npx vercel env pull .env.production"
  echo "Then run this script again."
  exit 1
fi

echo "Pushing schema and seeding..."
npx prisma db push
npx prisma db seed
echo "Done. Log in with admin@example.com / admin123"
exit 0
