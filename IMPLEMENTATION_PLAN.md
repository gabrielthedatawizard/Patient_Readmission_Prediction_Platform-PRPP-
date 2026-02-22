# TRIP Implementation Plan

## Execution model
- Deliver in small, testable slices.
- Keep clinical safety and access control in every phase.
- Ship fallback-safe behavior before advanced AI integrations.

## Phase tracker
- [x] Phase 0: Master prompt captured in repository (`prompt.md`).
- [x] Phase 1: Backend foundation (RBAC, auth, row-level access, audit logs, explainable risk engine fallback, task/analytics/audit APIs).
- [ ] Phase 2: PostgreSQL + Prisma schema + migrations (replace in-memory store).
- [ ] Phase 3: Offline-first sync contracts (queue model, conflict policy, idempotent APIs).
- [ ] Phase 4: Swahili-first i18n infrastructure and terminology packs.
- [ ] Phase 5: Frontend data layer integration with new APIs (auth, patients, predictions, tasks, analytics).
- [ ] Phase 6: Explainability UI (factor bars, CI display, clinician override workflow).
- [ ] Phase 7: Fairness and data quality dashboards with alert thresholds.
- [ ] Phase 8: Security hardening (MFA/TOTP flows, secrets management, rate limiting, audit export).
- [ ] Phase 9: CI/CD, observability, and deployment manifests.
- [ ] Phase 10: Clinical validation protocol tooling and documentation package.

## Phase 1 deliverables
- JWT authentication and role-based permission checks.
- Row-level filtering by facility/region.
- Explainable readmission scoring with fallback path.
- Auto-generated intervention tasks from high/medium risk predictions.
- Audit trails for key actions.
- Data quality and fairness snapshot endpoints.

## Current status note
- Phase 2 foundation delivered:
- Prisma schema at `backend/prisma/schema.prisma`.
- Initial SQL migration at `backend/prisma/migrations/202602230001_init/migration.sql`.
- Seed script at `backend/prisma/seed.js`.
- DB setup guide at `backend/prisma/README.md`.
- Provider layer delivered:
- Data provider selector at `backend/src/data/index.js`.
- Prisma-backed repository implementation at `backend/src/data/prismaStore.js`.
- Remaining for Phase 2: apply migration in a live PostgreSQL environment, run seed, and execute end-to-end route tests with `TRIP_DATA_PROVIDER=prisma`.
