#!/usr/bin/env bash
set -e

echo "🗄️  Running Prisma migrations..."
pnpm --filter api prisma migrate dev --name "$1"
echo "✅ Migrations complete"
