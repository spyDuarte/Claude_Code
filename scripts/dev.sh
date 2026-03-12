#!/usr/bin/env bash
set -e

echo "🚀 Starting Plantão Radar development environment..."

# Check for .env
if [ ! -f ".env" ]; then
  echo "⚠️  .env not found. Copying from .env.example..."
  cp .env.example .env
  echo "📝 Edit .env with your values before running again."
fi

# Start infra services
echo "🐳 Starting PostgreSQL and Redis..."
docker-compose up -d postgres redis

# Wait for services
echo "⏳ Waiting for services to be healthy..."
sleep 3

# Run migrations if needed
echo "🗄️  Running Prisma migrations..."
pnpm db:migrate

# Start all apps
echo "🌐 Starting API and Web..."
pnpm dev
