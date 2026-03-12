# 📡 Plantão Radar

> Monitoramento inteligente de plantões médicos via WhatsApp

Plantão Radar is a SaaS platform for Brazilian doctors to automatically monitor WhatsApp groups for shift opportunities (plantões), analyze incoming messages with a hybrid heuristic + AI classifier, and auto-reply or queue for human review based on configurable compatibility filters.

---

## Product Overview

Medical professionals in Brazil coordinate shifts through WhatsApp groups. Finding relevant opportunities manually is time-consuming and error-prone. Plantão Radar:

1. Connects to WhatsApp (via provider abstraction)
2. Monitors selected groups for new messages
3. Runs messages through a cheap heuristic pre-filter
4. Classifies compatible opportunities with OpenAI GPT-4o-mini
5. Auto-replies or flags for review based on your profile settings
6. Logs every action for full auditability

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                      PLANTÃO RADAR                       │
│                                                          │
│   ┌──────────────┐         ┌────────────────────────┐   │
│   │  Next.js Web │ ──API── │     NestJS REST API     │   │
│   │  (App Router)│         │                        │   │
│   └──────────────┘         │  ┌──────────────────┐  │   │
│                             │  │  Message Pipeline│  │   │
│   ┌──────────────┐         │  │  ┌────────────┐  │  │   │
│   │  WhatsApp    │──webhook─┼──┼─▶│ Heuristics │  │  │   │
│   │  (via stub / │         │  │  │ Parser     │  │  │   │
│   │   real prov) │         │  │  │ Classifier │  │  │   │
│   └──────────────┘         │  │  │ Replies    │  │  │   │
│                             │  └────────────────┘  │   │
│   ┌──────────────┐         │                        │   │
│   │  PostgreSQL  │◀────────│  Prisma ORM             │   │
│   └──────────────┘         │                        │   │
│   ┌──────────────┐         │  BullMQ Workers         │   │
│   │    Redis     │◀────────│  (async processing)     │   │
│   └──────────────┘         └────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

---

## Monorepo Structure

```
plantao-radar/
├── apps/
│   ├── api/                  NestJS REST API
│   │   ├── src/
│   │   │   ├── auth/         Authentication (JWT)
│   │   │   ├── users/        User management
│   │   │   ├── whatsapp/     WhatsApp provider abstraction
│   │   │   ├── groups/       Group monitoring management
│   │   │   ├── filters/      User filter profiles
│   │   │   ├── messages/     Message pipeline (normalize, parse, classify)
│   │   │   ├── classifier/   AI + fallback classifier
│   │   │   ├── replies/      Reply engine + deduplication
│   │   │   ├── audit/        Audit logging
│   │   │   ├── queue/        BullMQ async processing
│   │   │   ├── health/       Health check endpoint
│   │   │   └── prisma/       Database client
│   │   └── prisma/
│   │       ├── schema.prisma
│   │       └── seed.ts
│   └── web/                  Next.js App Router frontend
│       └── src/
│           ├── app/
│           │   ├── (auth)/   Login, Register pages
│           │   └── dashboard/ Main app with sidebar
│           ├── components/   Sidebar, UI components
│           ├── lib/          API client, auth helpers, utils
│           └── hooks/        useAuth
├── packages/
│   └── shared/               Shared TypeScript types, Zod schemas, enums, constants
├── scripts/                  Dev/seed/migrate helpers
├── docker-compose.yml
├── .env.example
├── turbo.json
├── pnpm-workspace.yaml
└── tsconfig.base.json
```

---

## Stack

| Layer | Technology |
|---|---|
| Monorepo | pnpm workspaces + Turborepo |
| Frontend | Next.js 14 (App Router), React, Tailwind CSS |
| Forms | React Hook Form + Zod |
| Backend | NestJS (TypeScript) |
| Database | PostgreSQL + Prisma ORM |
| Queue | Redis + BullMQ |
| AI | OpenAI GPT-4o-mini (JSON mode) + fallback classifier |
| Auth | bcrypt + JWT (passport-jwt) |
| Tests | Jest (API), Vitest (shared) |
| Infra | Docker Compose |

---

## Prerequisites

- Node.js >= 20
- pnpm >= 9
- Docker & Docker Compose

---

## Setup

### 1. Clone and install dependencies

```bash
git clone <repo>
cd plantao-radar
pnpm install
```

### 2. Configure environment

```bash
cp .env.example .env
# Edit .env — at minimum set JWT_SECRET and optionally OPENAI_API_KEY
```

### 3. Start infrastructure (PostgreSQL + Redis)

```bash
docker-compose up -d postgres redis
```

### 4. Run database migrations

```bash
pnpm db:migrate
# Creates tables and initial Prisma migration
```

### 5. Seed demo data

```bash
pnpm db:seed
# Creates: 1 user, 1 filter, 3 groups, 5 messages, mixed match results
# Login: demo@plantaoradar.com / demo1234
```

---

## Running the Applications

### Development (both apps with hot reload)

```bash
pnpm dev
# API:  http://localhost:3001
# Web:  http://localhost:3000
# Docs: http://localhost:3001/api/docs
```

### Run API only

```bash
pnpm --filter api dev
```

### Run Web only

```bash
pnpm --filter web dev
```

---

## Environment Variables

| Variable | Description | Default |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | — |
| `REDIS_URL` | Redis connection string | `redis://localhost:6379` |
| `JWT_SECRET` | JWT signing secret | — |
| `JWT_EXPIRES_IN` | Token expiration | `7d` |
| `OPENAI_API_KEY` | OpenAI API key (optional) | — |
| `OPENAI_MODEL` | Model to use | `gpt-4o-mini` |
| `API_PORT` | API listen port | `3001` |
| `WEB_PORT` | Web listen port | `3000` |
| `NEXT_PUBLIC_API_URL` | API URL for the web client | `http://localhost:3001` |
| `CORS_ORIGIN` | Allowed CORS origin | `http://localhost:3000` |
| `WHATSAPP_PROVIDER` | Provider type (`stub` or custom) | `stub` |
| `WHATSAPP_PROVIDER_BASE_URL` | External provider base URL | — |
| `WHATSAPP_PROVIDER_API_KEY` | External provider API key | — |

> If `OPENAI_API_KEY` is not set, the system uses the rule-based fallback classifier automatically.

---

## Running Tests

```bash
# All tests
pnpm test

# API tests only
pnpm --filter api test

# Watch mode
pnpm --filter api test:watch

# Coverage
pnpm --filter api test:cov
```

Tests cover:
- Text normalization (`normalizer.spec.ts`)
- Opportunity detection heuristics (`heuristics.spec.ts`)
- Entity extraction (`parser.spec.ts`)
- Decision engine threshold logic (`decision-engine.spec.ts`)
- Deduplication key logic (`deduplication.spec.ts`)
- Auth service integration (`auth.integration.spec.ts`)

---

## Prisma Commands

```bash
# Generate Prisma client after schema changes
pnpm db:generate

# Create and apply a new migration
pnpm db:migrate

# Reset database (drops all data!)
pnpm db:reset

# Open Prisma Studio
pnpm --filter api prisma studio
```

---

## Simulating Webhook Input

Once the API is running, you can simulate an incoming WhatsApp message:

```bash
curl -X POST http://localhost:3001/whatsapp/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "type": "message",
    "sessionRef": "stub-ref-001",
    "externalMessageId": "test-msg-001",
    "externalGroupId": "ext-group-001@g.us",
    "senderName": "Dr. Carlos",
    "senderNumber": "5511999990001",
    "messageText": "Plantao disponivel! Clinico geral, Hospital das Clinicas SP, noturno 12h, dia 20/06. Valor R$ 1.800. Interessados chamar."
  }'
```

The message will be processed through the full pipeline:
1. Heuristics (keyword detection, money/date extraction)
2. Parser (city, hospital, specialty extraction)
3. AI classifier (or fallback if no API key)
4. Decision engine (auto-send / review / reject)
5. Reply engine (deduplication + send or queue)

---

## WhatsApp Provider

The system ships with a **stub provider** that:
- Simulates QR code generation
- Auto-connects after 5 seconds
- Returns hardcoded groups on `listGroups`
- Logs send attempts without actually sending

To integrate a real WhatsApp provider (e.g., WAPI, Z-API, Baileys):
1. Implement `IWhatsAppProvider` in `apps/api/src/whatsapp/interfaces/`
2. Register in `WhatsAppModule` based on `WHATSAPP_PROVIDER` env var
3. Set `WHATSAPP_PROVIDER_BASE_URL` and `WHATSAPP_PROVIDER_API_KEY`

---

## API Documentation

Swagger UI is available at `http://localhost:3001/api/docs` when the API is running.

---

## Future Improvements

- Real WhatsApp provider integration (Baileys, WAPI, Z-API)
- Real-time updates via WebSocket / SSE for live opportunity alerts
- Multi-session support per user
- Push notifications for high-score opportunities
- Weekly/monthly analytics dashboard
- Mobile PWA
- Multi-user organizations / team accounts
- Refresh token support
- Rate limiting and abuse prevention
- Advanced ML model fine-tuned on Brazilian medical shift language
- Calendar integration for automated availability checking
