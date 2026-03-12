#!/usr/bin/env bash
set -e

echo "🌱 Running seed script..."
pnpm db:seed
echo "✅ Seed complete"
