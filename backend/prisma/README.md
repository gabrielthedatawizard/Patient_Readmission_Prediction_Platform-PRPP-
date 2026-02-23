# Prisma Database Setup (Phase 2)

This folder contains the PostgreSQL schema and migration assets for TRIP.

## Prerequisites
- PostgreSQL 15+
- `DATABASE_URL` configured in `backend/.env`

Example:
`DATABASE_URL=postgresql://trip_user:trip_password@localhost:5432/trip_platform?schema=public`
`TRIP_DATA_PROVIDER=prisma`

## Commands
Run from `backend/`:

1. Generate Prisma client:
`npm run prisma:generate`

2. Apply development migration:
`npm run prisma:migrate:dev -- --name init`

3. Apply production migrations:
`npm run prisma:migrate:deploy`

4. Seed baseline roles/facilities/demo users:
`npm run prisma:seed`

## Seed dataset
- 10 roles
- 5 regions
- 5 facilities
- Demo users (`<role>@trip.go.tz`)
- 3 demo patients
- 1 demo visit/prediction/task
- Patient `clinicalProfile` JSON snapshots for model-ready feature parity

Default demo password:
`Trip@2026`

## Notes
- This phase adds DB schema, seed assets, and a Prisma-backed data provider.
- If Prisma client generation or DB connection is unavailable, the backend falls back to in-memory mode.
- Sync events are persisted through `AuditLog` rows with `action=sync_event`.
