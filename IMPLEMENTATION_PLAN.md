# TRIP Implementation Plan

## Execution model
- Deliver in small, testable slices.
- Keep clinical safety and access control in every phase.
- Ship fallback-safe behavior before advanced AI integrations.

## Phase tracker
- [x] Phase 0: Master prompt captured in repository (`prompt.md`).
- [x] Phase 1: Backend foundation (RBAC, auth, row-level access, audit logs, explainable risk engine fallback, task/analytics/audit APIs).
- [x] Phase 2: PostgreSQL + Prisma schema + migrations (replace in-memory store).
- [x] Phase 3: Offline-first sync contracts (queue model, conflict policy, idempotent APIs).
- [x] Phase 4: Swahili-first i18n infrastructure and terminology packs.
- [x] Phase 5: Frontend data layer integration with new APIs (auth, patients, predictions, tasks, analytics).
- [x] Phase 6: Explainability UI (factor bars, CI display, clinician override workflow).
- [x] Phase 7: Fairness and data quality dashboards with alert thresholds.
- [x] Phase 8: Security hardening (MFA/TOTP flows, secrets management, rate limiting, audit export).
- [x] Phase 9: CI/CD, observability, and deployment manifests.
- [x] Phase 10: Clinical validation protocol tooling and documentation package.

## National AI Engine Extensions (Delivered)
- [x] FHIR Mediator and Polling Service — real-time EMR ingestion with configurable FHIR_BASE_URL
- [x] Client Registry Mediator — NIDA/Phone/Name identity resolution
- [x] CTC2 Mediator — HIV treatment status enrichment from CTC2 registries
- [x] eLMIS Mediator — Medication dispensing data enrichment
- [x] CHW SMS Alert Dispatcher — Automated Community Health Worker notifications on high-risk discharge
- [x] SMS Gateway — Africa's Talking + Beem multi-provider support
- [x] Email Gateway — SMTP-based operational alert path
- [x] Notification Service — Multi-channel dispatch (SMS + Email + WebSocket)
- [x] Edge AI Predictor — Offline browser-based logistic regression surrogate with sync
- [x] SMART-on-FHIR Embed — Embeddable prediction view for GoTHoMIS/EMR integration
- [x] ML Engineer Dashboard — Data drift monitoring + model telemetry
- [x] Edge AI Observability UI — Model version, sync status, and manual sync in Settings
- [x] CHW SMS Dispatch Indicators — Real-time delivery status in NotificationPanel

## Phase 9 deliverables
- GitHub Actions CI workflow for lint + test on PR/push + security scan + docker build verification
- Docker Compose production manifest for backend + frontend
- Production Dockerfile and nginx configuration for frontend SPA
- Health check endpoints and structured logging in Express
- Deployment documentation updated for Docker workflows

## Phase 10 deliverables
- Evaluation toolkit CLI script (`backend/scripts/evaluateCohort.js`) to extract cohorts and evaluate prediction accuracy (ROC AUC, Precision/Recall, F1) against ground truth outcomes.
- Model Card Template (`docs/validation/MODEL_CARD.md`) for regulatory transparency.
- Data Processing Agreement (DPA) Template (`docs/validation/DPA_TEMPLATE.md`).
