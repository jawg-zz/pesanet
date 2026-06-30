#!/bin/sh
# PesaNet Docker entrypoint
# - Runs prisma db push to ensure schema matches
# - Seeds sample data if database is empty
# - Then starts the application

set -e

echo "⏳ Running database schema sync..."
./node_modules/.bin/prisma db push --accept-data-loss 2>&1

# Seed if the database has no packages (empty/fresh DB)
PACKAGE_COUNT=$(bun -e "
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.package.count().then(c => { console.log(c); process.exit(0); }).catch(() => { console.log('0'); process.exit(0); });
" 2>/dev/null || echo "0")

if [ "$PACKAGE_COUNT" = "0" ] || [ "$PACKAGE_COUNT" -lt 3 ]; then
  echo "🌱 Seeding database with sample data..."
  bun run prisma/seed.ts 2>&1 || true
  bun run prisma/seed-features.ts 2>&1 || true
  bun run prisma/seed-v3.ts 2>&1 || true
  echo "✅ Database seeded."
else
  echo "✅ Database already contains data ($PACKAGE_COUNT packages found). Skipping seed."
fi

echo "🚀 Starting PesaNet server on port ${PORT:-3000}..."
exec "$@"
