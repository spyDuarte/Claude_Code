# Infrastructure

This folder contains infrastructure helpers for Plantão Radar.

## Docker Compose

The main `docker-compose.yml` at the repo root provides:
- `postgres` — PostgreSQL 15 database
- `redis` — Redis 7 for BullMQ queues and deduplication
- `api` — NestJS API (profile: full)
- `web` — Next.js frontend (profile: full)

## Development

For local development, only start the infra services:

```bash
docker-compose up -d postgres redis
```

Then run the apps with `pnpm dev` in the repo root.

## Production

To run the full stack in Docker:

```bash
cp .env.example .env
# Fill in all values

docker-compose --profile full up -d
```
