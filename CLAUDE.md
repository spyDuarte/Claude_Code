# Plantão Radar — Claude Code Guide

Monorepo SaaS para monitoramento de plantões médicos via WhatsApp. Classificador híbrido (heurísticas + Claude AI) que filtra mensagens e auto-responde oportunidades compatíveis.

## Commands

```bash
# Development (requires Docker for DB + Redis)
pnpm dev             # Start API (3001) + Web (3000) in watch mode
pnpm build           # Build all packages
pnpm test            # Run all tests (Jest for API, Vitest for shared)
pnpm lint            # ESLint across all packages

# Database
pnpm db:migrate      # Run Prisma migrations (requires DB)
pnpm db:seed         # Seed demo data (5 sample users/messages)
pnpm db:generate     # Regenerate Prisma client after schema changes

# Infrastructure (Docker)
docker compose up -d postgres redis   # Start DB + Redis only
bash scripts/dev.sh                   # Full dev setup (infra + deps + dev)
```

## Architecture

```
apps/api/        NestJS REST API (port 3001)
  src/
    auth/        JWT authentication (register, login)
    users/       User management
    whatsapp/    WhatsApp provider abstraction (stub | real)
    groups/      Group monitoring subscriptions
    filters/     User filter profiles (specialty, cities, hospitals, thresholds)
    messages/    Pipeline: normalize → heuristics → parse → classify → decide
    classifier/  AI classifier (Anthropic Claude / OpenAI / fallback heuristics)
    replies/     Reply engine with deduplication
    audit/       Full audit trail logging
    queue/       BullMQ async job processing (Redis)
    health/      Health check endpoint
  prisma/        Database schema + seed data

apps/web/        Next.js 14 App Router (port 3000)
  src/app/
    (auth)/      Login + Register pages
    dashboard/   Main app: whatsapp, groups, filters, opportunities, history, logs

packages/shared/ Shared TypeScript types, Zod schemas, enums (used by both apps)
```

## AI Classifier

The message classifier is configurable via environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `AI_CLASSIFIER_PROVIDER` | `anthropic` | `anthropic` or `openai` |
| `ANTHROPIC_API_KEY` | — | Claude API key |
| `ANTHROPIC_MODEL` | `claude-opus-4-6` | Claude model to use |
| `OPENAI_API_KEY` | — | OpenAI key (only if provider=openai) |

If no API key is configured, the system falls back to rule-based classification (`FallbackClassifierService`).

**Classifier files:**
- `apps/api/src/classifier/anthropic-classifier.service.ts` — Primary (Claude API)
- `apps/api/src/classifier/openai-classifier.service.ts` — Alternative
- `apps/api/src/classifier/fallback-classifier.service.ts` — Rule-based fallback
- `apps/api/src/classifier/classifier.module.ts` — Provider injection

## Key Environment Variables

Copy `.env.example` → `.env` and fill in:

```bash
DATABASE_URL=postgresql://plantao:plantao@localhost:5432/plantao_radar
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-secret-here
AI_CLASSIFIER_PROVIDER=anthropic
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-opus-4-6
```

## Message Processing Pipeline

1. **Heuristics** — Fast keyword/pattern matching to discard non-shift messages
2. **Parser** — Extract entities: city, hospital, specialty, date, value, shift type
3. **Classifier** — AI or fallback scoring against user's filter profile (0–1 score)
4. **Decision Engine** — `score >= autoThreshold` → AUTO_REPLY, `>= semiAutoThreshold` → QUEUE_REVIEW, else IGNORE
5. **Reply Engine** — Deduplication check → send or queue

## Testing

```bash
# API unit tests (Jest)
pnpm --filter api test

# Run specific test file
pnpm --filter api test -- --testPathPattern=normalizer
pnpm --filter api test -- --testPathPattern=classifier
pnpm --filter api test -- --testPathPattern=heuristics

# Shared package tests (Vitest)
pnpm --filter @plantao-radar/shared test
```

## Stack

- **Backend**: NestJS 10 + TypeScript + Prisma ORM
- **Frontend**: Next.js 14 App Router + Tailwind CSS + React Hook Form
- **Database**: PostgreSQL 15
- **Queue**: Redis 7 + BullMQ
- **AI**: Anthropic Claude (primary) / OpenAI (optional) / Rule-based fallback
- **Auth**: JWT + Passport.js
- **Monorepo**: pnpm workspaces + Turborepo
