#!/bin/bash
set -euo pipefail

# Only run full setup in remote (Claude Code on the web) environments
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  echo "Local environment detected — skipping remote setup."
  exit 0
fi

echo "==> Plantão Radar — Session Start Hook"
echo "==> Setting up development environment..."

# ── 1. Ensure pnpm is available ──────────────────────────────────────────────
if ! command -v pnpm &>/dev/null; then
  echo "==> Installing pnpm..."
  npm install -g pnpm@9
fi

cd "${CLAUDE_PROJECT_DIR:-.}"

# ── 2. Create .env if missing ─────────────────────────────────────────────────
if [ ! -f .env ] && [ -f .env.example ]; then
  echo "==> Copying .env.example → .env"
  cp .env.example .env
fi

# ── 3. Install all workspace dependencies ────────────────────────────────────
echo "==> Installing dependencies (pnpm install)..."
pnpm install

# ── 4. Build shared package (required for TypeScript resolution) ──────────────
echo "==> Building shared package..."
pnpm --filter @plantao-radar/shared build

# ── 5. Generate Prisma client (required for API TypeScript types) ─────────────
echo "==> Generating Prisma client..."
pnpm --filter api prisma:generate

echo ""
echo "✅ Environment ready! Available commands:"
echo "   pnpm dev          — Start API + Web in development mode (requires DB/Redis)"
echo "   pnpm build        — Build all packages"
echo "   pnpm test         — Run all tests"
echo "   pnpm lint         — Run ESLint across all packages"
echo "   pnpm db:migrate   — Run Prisma migrations (requires DB)"
echo "   pnpm db:seed      — Seed demo data (requires DB)"
echo ""
