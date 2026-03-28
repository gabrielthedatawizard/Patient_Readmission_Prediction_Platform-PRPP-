# TRIP MVP Implementation Plan

Last updated: 2026-03-28
Source of truth: `TRIP_Blueprint_v2_SourceVerified.docx` plus direct repo audit of the linked PRPP repository.

## Working Rules

- Implement one vertical slice at a time and verify the current file state before editing.
- Keep clinical safety, data protection, and role-based access control ahead of convenience features.
- Treat the current model as non-clinical until synthetic artifacts are replaced with real de-identified training data.
- Separate `code-ready now` work from `externally blocked` work so progress does not stall.

## Workflow Guides We Will Use

These are the most relevant local workflow references from `everything-claude-code`. We will adapt their principles to this Codex environment as we implement each slice.

- Planning standard: `everything-claude-code/docs/tr/commands/plan.md`
  - Use before each major slice to restate scope, risks, dependencies, and acceptance criteria before editing.
- Verification standard: `everything-claude-code/docs/tr/commands/verify.md`
  - Use after each meaningful slice for build, lint, tests, security checks, console log checks, and git diff review.
- Continuous quality loop: `everything-claude-code/docs/tr/skills/verification-loop/SKILL.md`
  - Treat verification as an every-slice gate, not a one-time end-of-project step.
- Frontend quality standard: `everything-claude-code/docs/tr/skills/frontend-patterns/SKILL.md`
  - Apply composition-first React patterns, consistent loading/error states, responsive layouts, accessibility, and selective performance optimization.
- Frontend workflow standard: `everything-claude-code/docs/tr/commands/multi-frontend.md`
  - Use the workflow shape more than the exact multi-model tooling: research, ideation, plan, execute, optimize, review.
- Python and ML code standard: `everything-claude-code/docs/tr/skills/python-patterns/SKILL.md`
  - Apply readable data-pipeline code, explicit error handling, type-aware design, generator/context-manager patterns where useful, and minimal surprise in training scripts.
- Deployment standard: `everything-claude-code/docs/tr/skills/deployment-patterns/SKILL.md`
  - Use for Dockerfiles, `docker-compose.yml`, health checks, readiness checks, environment validation, rollback thinking, and production readiness.
- E2E standard: `everything-claude-code/docs/tr/skills/e2e-testing/SKILL.md`
  - Use once the frontend data layer is stabilized to validate login, prediction, task, and alert workflows end to end.
- Eval-driven model/change standard: `everything-claude-code/docs/tr/skills/eval-harness/SKILL.md`
  - Define pass/fail criteria before model-pipeline or inference changes, especially for feature engineering, training methodology, and regression safety.

## Repo Snapshot

### Verified already in the repo

- Backend/API foundation is real and usable: auth, RBAC, audit, alerts, analytics, sync, and health routes are wired in `backend/server.js`.
- Prisma/PostgreSQL groundwork exists: schema, migrations, seed, Prisma store, and `phase2:verify` script already exist under `backend/prisma/` and `backend/src/data/`.
- Offline-first contracts are partially implemented: `/api/sync/pull` and `/api/sync/push` exist, and the frontend already has offline queue helpers in `src/services/offlineStorage.js` and `src/services/syncService.js`.
- Frontend application shell is real: auth/session handling, providers, dashboards, SHAP component, i18n, and service worker are already present.
- ML export and monitoring foundations exist: `backend/src/routes/analytics.js` exposes training dataset and monitoring endpoints.
- Local full-stack container baseline now exists: the repo has a root `docker-compose.yml`, `backend/Dockerfile`, and updated setup docs for the Prisma + ML local stack.

### Verified gaps or partial areas

- Frontend data layer is now more broadly modernized. React Query is installed and wired for the main patient, task, alert, prediction, analytics, audit, and ML-monitoring flows, but end-to-end verification and some lower-priority dashboard surfaces still remain.
- Notifications are partially complete. `backend/src/services/notificationService.js` now supports an Africa's Talking SMS gateway path and alert-channel persistence, but live provider verification is still pending.
- PII/security hardening is partially complete. Patient PII encryption now exists in the Prisma path, but full production migration and operational key-rotation processes still need completion and live validation.
- JWT production safeguards are partly present. `backend/src/middleware/auth.js` enforces a strong secret in production, but token signing still uses `HS256`.
- Tanzania-specific disease features are now partially implemented. Backend feature extraction, export rows, the ML fallback predictor, and the synthetic training path now understand malaria, HIV/ART, TB, SAM, sickle cell, and neonatal risk, but they have not yet been exercised on real pilot-facility data.
- Training methodology is now partially corrected. `ml-service/scripts/train_model.py` now uses date-based train/validation/test splitting and emits temporal metrics, but the committed artifacts are still synthetic-data artifacts until Step 7 and Step 10 are completed.
- Real-data ingestion is now partially prepared. `ml-service/scripts/ingest_real_data.py` can normalize backend ML exports into the temporal training schema and emit a validation report, but execution still depends on receiving a real pilot-facility extract.
- DHIS2 integration is now partially implemented. The backend now has a DHIS2 client, preview-first sync route, and facility import flow, but live execution still depends on credentials and org-unit mapping decisions.
- Local verification in this shell is still partially blocked by environment issues: the Docker daemon was unavailable for Step 1, so full containerized verification still remains pending.

### External blockers that code alone cannot solve

- Real model validity depends on pilot-facility de-identified admissions data. The current committed artifacts are trained on synthetic data.
- DHIS2 rollout depends on MoH credentials, field mapping, and org-unit sync decisions.
- Clinical deployment cannot proceed until real-data retraining, calibration review, and validation are complete.

## Ordered MVP Sequence

## 1. Baseline Verification and Local Runbook

Status: `partial`

Why this comes first:
- Every later slice needs a repeatable backend + database + ML runtime.
- The repo already has most of the pieces, so this is a fast unblocker.

Current repo state:
- `backend/package.json` already contains `phase2:verify`.
- `backend/src/data/index.js` already supports strict Prisma mode.
- A root `docker-compose.yml` now exists for frontend, backend, PostgreSQL, and the ML service.
- A `backend/Dockerfile` now exists and is wired into the local stack docs.

Deliverables:
- Add `docker-compose.yml` for frontend, backend, database, and ML service.
- Add or verify `backend/Dockerfile`.
- Document one-command local startup and verification steps.

Progress update on 2026-03-26:
- Added `docker-compose.yml` at the repo root.
- Added `backend/Dockerfile`.
- Added Docker ignore files for backend and ML service build hygiene.
- Updated `QUICK_START.md` and `SETUP.md` to separate demo mode from the recommended Prisma + ML local stack.
- Verified `docker compose config` passes.
- Full stack boot verification is still pending because the Docker daemon was not running in the current environment.

Progress update on 2026-03-27:
- Hardened backend boot behavior so production auth/data-provider misconfiguration does not crash the entire API at import time.
- Added clearer 503 responses plus health/readiness visibility for missing `JWT_SECRET` or unavailable strict Prisma data-provider configuration.
- This specifically improves diagnosis of deployed login failures where the previous symptom was only a generic server error.

Done when:
- We can boot PostgreSQL-backed local dev reliably.
- `npm run phase2:verify` can be run against a local database.
- `/api/ready` reports healthy with Prisma enabled.

## 2. Frontend API Wiring Stabilization

Status: `partial`

Why this is early:
- It is high-value, code-ready, and not blocked on external data access.
- The UI already has the right screens; it mainly needs a stronger data layer.

Current repo state:
- `src/services/apiClient.js` already exposes auth, patients, tasks, predictions, alerts, and audit calls.
- `src/context/PatientProvider.jsx` and `src/context/TaskProvider.jsx` already fetch and normalize live data.
- `src/main.jsx` now wraps the app in TanStack Query.
- `package.json` now includes `@tanstack/react-query`.
- Shared query hooks now exist in `src/hooks/useTrip.js`.

Deliverables:
- Install TanStack Query and add a shared `QueryClient`.
- Create `src/hooks/useTrip.js` for the highest-priority queries and mutations.
- Migrate the first dashboards/views away from ad hoc fetch flows to query hooks.
- Keep existing offline behavior where it already adds value.

Progress update on 2026-03-26:
- Added TanStack Query dependency plus a shared `QueryClient` in `src/services/queryClient.js`.
- Added `src/hooks/useTrip.js` for patients, tasks, alerts, batch predictions, prediction history, and the highest-priority mutations.
- Wrapped the app with `QueryClientProvider` and connected auth lifecycle events to query invalidation/reset.
- Updated `PatientProvider`, `TaskProvider`, and `AlertProvider` to hydrate from shared queries while preserving offline fallbacks.
- Fixed previously empty `/patients` and `/tasks` views by wiring them to provider-backed data instead of hard-coded empty arrays.
- Fixed patient-detail routing to resolve patients by URL param rather than relying only on in-memory selection.
- Restored the missing `/discharge/:id` route and wired discharge completion plus prediction overrides back into patient state and query invalidation.
- Verification status:
  - `eslint` now passes with no errors and only four pre-existing warnings in `src/dashboards/MLEngineerDashboard.jsx`.
  - `vite build` now succeeds after a clean reinstall under Node `20.20.2` and npm `10.9.7`.

Progress update on 2026-03-27:
- Added `src/hooks/useAnalytics.js` so analytics overview, audit logs, quality/fairness snapshots, ML monitoring, and training-dataset export all use the shared React Query layer.
- Refactored `src/components/analytics/Analytics.jsx`, `src/components/analytics/DataQualityDashboard.jsx`, and `src/dashboards/MLEngineerDashboard.jsx` away from manual fetch orchestration and onto query-driven loading, refresh, stale-data, and retry behavior.
- Upgraded `src/hooks/useDashboardData.js` and the analytics service/client path so dashboard reads now get the same protected error parsing as the rest of the app and keep previous data during background refresh.
- Added route-level lazy loading for `PatientsList` and `Tasks`, plus explicit Vite manual chunking for React, routing, query, charts, motion, icons, and export libraries to reduce initial bundle pressure.
- Verification status:
  - `eslint` passes with no warnings.
  - `vite build` passes under Node `20.20.2`.
  - The main entry bundle dropped from the earlier ~541 kB warning case to ~107 kB after chunking, and the build no longer reports any >500 kB chunk warning.

Done when:
- Patients, alerts, tasks, and latest prediction flows use shared query hooks.
- Loading, error, and retry behavior is standardized.
- The highest-priority dashboards no longer depend on scattered one-off fetch logic.

## 3. Notification Gateway Completion

Status: `partial`

Why this is early:
- The alert pipeline already exists, so this is a contained completion task.
- It adds real operational value without changing the core model.

Current repo state:
- `backend/src/services/notificationService.js` already persists alerts and records SMS/email channel metadata.
- SMS is still only marked as `queued` or `skipped_missing_phone`; no external provider call is made.

Deliverables:
- Add an SMS provider abstraction.
- Implement an Africa's Talking adapter first.
- Audit outbound delivery attempts and failures.
- Keep in-app/WebSocket alerts as fallback behavior.

Progress update on 2026-03-27:
- Added a dedicated SMS gateway service with provider/config status helpers and an Africa's Talking adapter.
- Changed high-risk SMS escalation to an operations-contact default instead of using the patient phone implicitly.
- Made SMS delivery opt-in via explicit environment configuration.
- Alert records now persist post-attempt SMS channel outcomes such as `submitted`, `failed`, `provider_not_configured`, and `skipped_missing_operations_contact`.
- Added per-channel audit records for SMS delivery outcomes in addition to the existing alert-dispatched audit event.
- Exposed SMS gateway status in `/api/health` so deployments can tell whether alerting is actually wired.
- Extended analytics automation summaries with SMS submitted/failed/skipped counts for downstream dashboard use.

Done when:
- High-risk alerts trigger both persisted in-app alerts and real SMS dispatch attempts.
- Delivery failures are visible in logs and audit history.

## 4. PII Encryption and Production Security Hardening

Status: `partial`

Why this must happen before real data:
- It is the biggest legal/safety gap for any non-demo deployment.
- It is self-contained enough to implement before real-data ingestion.

Current repo state:
- `backend/prisma/schema.prisma` stores patient PII in plaintext columns.
- `backend/src/lib/prisma.js` only initializes Prisma; it does not transform or protect PII.
- `backend/src/middleware/auth.js` already blocks weak production secrets but still uses `HS256`.

Deliverables:
- Add `backend/src/lib/encryption.js` using AES-256-GCM.
- Add Prisma middleware for transparent encrypt-on-write and decrypt-on-read.
- Update Prisma schema and create the migration path.
- Enforce presence/validity of `ENCRYPTION_KEY` in non-demo production-like modes.
- Review whether to keep hardened `HS256` for MVP or move to `RS256` in a later hardening slice.

Progress update on 2026-03-27:
- Added `backend/src/lib/encryption.js` with AES-256-GCM helpers, config validation, and health-status reporting.
- Updated `backend/src/lib/prisma.js` so patient `create`, `update`, `upsert`, and read queries transparently encrypt and decrypt `name`, `phone`, and `address`.
- Added patient encryption metadata to the Prisma schema and a manual migration for `piiVersion` and `piiEncryptedAt`.
- Updated `backend/prisma/seed.js` to go through the protected Prisma client so seeded Prisma records follow the same encryption path as the app.
- Preserved backward compatibility for existing plaintext rows by only decrypting values with the encryption prefix.
- Moved patient-name search to in-memory filtering after facility scoping so encrypted-at-rest names do not break the patient list UX.
- Closed two access-control gaps while touching the same scope layer:
  - `listPatientsForUser` no longer allows a caller-supplied `facilityId` to override accessible facility scope.
  - `listSyncEventsForUser` no longer allows cross-facility sync pulls by query parameter.
- Extended `/api/health` and readiness logic to surface encryption status and to report unavailable Prisma mode correctly instead of appearing as demo mode.
- Pinned `backend/package.json` to `jsonwebtoken@9.0.2` after local verification showed the resolved `9.0.3` package missing an auth-runtime file.

Done when:
- New patient writes are encrypted at rest.
- Reads return decrypted values to the app layer.
- Production startup fails fast if encryption config is unsafe.

## 5. Tanzania-Specific Feature Expansion

Status: `partial`

Why it comes before real retraining:
- We can prepare the feature pipeline now even before pilot data arrives.
- It addresses one of the largest blueprint validity gaps.

Current repo state:
- `backend/src/services/predictionFeatureBuilder.js` now derives malaria, HIV/ART, TB, SAM, sickle cell, and neonatal risk flags in addition to the existing chronic disease features.
- `backend/src/services/mlDatasetService.js` now exports those Tanzania-priority features into training rows and source feature snapshots.
- `ml-service/app/predictor.py`, `ml-service/scripts/train_model.py`, and `ml-service/scripts/generate_synthetic_data.py` now understand the expanded feature set and keep backward-compatible defaults for older datasets.
- `ml-service/scripts/build_artifact_from_export.py` is now compatible again with the predictor helper exports.

Deliverables:
- Extend backend feature extraction for malaria, HIV/ART, TB, SAM, sickle cell, and neonatal risk flags where data is available.
- Extend training features and predictor expectations to match.
- Keep backward compatibility for demo/sample records that do not yet contain all new fields.

Progress in this repo:
- Added Tanzania-priority feature derivation and neonatal context detection in the backend feature builder, including ART medication inference and exported training-row coverage.
- Extended the Python fallback predictor, explanations, artifact calibration path, and synthetic training-data generator for the same new fields.
- Added focused tests and runtime checks for the Tanzania-specific predictor path.
- Local verification passed for Python unit tests, JS syntax checks, a backend runtime derivation check, and synthetic-data generation. Backend Jest remains blocked in this shell by the pre-existing `pkg-dir` dependency issue in `backend/node_modules`.

Done when:
- New Tanzania-specific features appear in exported training rows.
- Predictor input, training metadata, and explanation output understand those features.

## 6. Temporal Holdout Training Upgrade

Status: `partial`

Why it is still worth doing before real data arrives:
- The code can be corrected now, even if the final metrics must wait on real data.
- It removes a known methodology flaw from the training path.

Current repo state:
- `ml-service/scripts/train_model.py` now uses date-based train/validation/test splitting, model selection on temporal validation metrics, and shipped-artifact temporal metrics in metadata.
- `ml-service/scripts/generate_synthetic_data.py` now emits `admission_date` and `discharge_date` along with the Tanzania-priority feature columns used by the upgraded trainer.
- The default training dataset and committed artifacts are still synthetic, so methodology is improved but clinical validity still depends on Step 7 and Step 10.

Deliverables:
- Replace random-fold evaluation with date-based train/validation/test splitting.
- Emit validation/test metrics into model metadata.
- Preserve calibration and model artifact generation.

Progress in repo:
- Added a real CLI to the training script with `--data-path`, `--output-dir`, and `--skip-shap` so local retraining is easier to operate and verify.
- Added safer calibration fallback logic for smaller or uneven temporal cohorts.
- Regenerated the bundled synthetic dataset with temporal columns and refreshed the checked-in model artifacts from the temporal training path.
- Added focused unit tests for temporal date normalization, split ordering, and calibration fallback behavior.
- Local verification passed for Python syntax checks, synthetic-data generation, trainer CLI help, full temporal training, and ML unit tests.

Done when:
- Training runs on time-ordered data and reports temporal metrics.
- The script no longer depends on random K-fold as its primary evaluation path.

## 7. Real Data Ingestion Pipeline

Status: `partial`

Why this is still in the MVP plan:
- It is the central clinical blocker and must remain visible.
- The code work can begin, but execution depends on pilot data access.

Current repo state:
- Dataset export already exists in the backend.
- `ml-service/scripts/ingest_real_data.py` now exists and can normalize backend export rows into the snake_case temporal-training schema used by `ml-service/scripts/train_model.py`.
- The ingester drops rows without usable temporal dates or binary labels, and emits a JSON validation report that highlights diagnosis rows still needing mapping review.
- The committed model artifacts still reflect synthetic training data.

Deliverables:
- Add a real-data ingestion and normalization script.
- Validate required columns, dates, labels, and diagnosis mappings.
- Produce training-ready rows for the temporal holdout pipeline.

Progress in repo:
- Added `ml-service/scripts/ingest_real_data.py` with JSON/CSV export support, provenance fields, strict-mode validation, and a sidecar ingestion report.
- Added focused unit coverage for row normalization, dropped-row reporting, diagnosis-mapping review detection, and end-to-end CSV/report emission.
- Updated `ml-service/README.md` with the intended real-data workflow: backend export -> ingestion normalization -> temporal training.
- Local verification passed for Python syntax checks and the full ML unit-test suite, including the new ingestion coverage.

Done when:
- A pilot-facility extract can be converted into a clean training dataset.

External dependency:
- Requires de-identified admissions/discharge data from at least one pilot facility.

## 8. DHIS2 Integration

Status: `partial`

Why it is after the earlier slices:
- It is important, but not required to complete the immediate app-hardening and model-prep work.
- It depends on external system access and mapping choices.

Current repo state:
- `backend/src/integrations/dhis2Client.js` now exists and can fetch DHIS2 organisation units with environment-driven configuration.
- `backend/src/routes/integrations.js` now exposes admin-facing `GET /api/integrations/dhis2/status` and `POST /api/integrations/dhis2/sync` endpoints.
- Facility sync now supports preview mode, deterministic DHIS2 identifiers, and provider-backed facility upserts for both memory and Prisma data stores.
- Live execution is still blocked on DHIS2 credentials and final org-unit level mapping decisions.

Deliverables:
- Add `backend/src/integrations/dhis2Client.js`.
- Implement org-unit sync and facility import flow.
- Add admin-facing sync trigger or scheduled job entry point.

Progress in repo:
- Added a DHIS2 Web API client plus sync service that converts organisation units into TRIP facilities with region/district derivation and platform-level inference.
- Added provider-backed facility sync support, including Prisma schema fields for `dhis2OrgUnitId` and `dhis2Code` to avoid duplicate-facility drift on repeat imports.
- Added a preview-first sync route and DHIS2 status route for `moh` and `ml_engineer` users, along with health-snapshot visibility and deployment env-var guidance.
- Local verification passed for JS syntax checks and a direct DHIS2 sync-service smoke test with mocked org-unit data; backend Jest and full Express boot remain blocked in this shell by the pre-existing broken `backend/node_modules` dependency state.

Done when:
- Facility hierarchy can be refreshed from DHIS2 into Prisma-backed storage.

External dependency:
- Requires MoH DHIS2 service credentials and org-unit field mapping.

## 9. Monitoring, Calibration, and Drift

Status: `partial`

Why this follows the earlier model-prep work:
- Some monitoring already exists, but the clinically important metrics are still incomplete.
- The value increases once the feature set and training flow are corrected.

Current repo state:
- `backend/src/routes/analytics.js` already exposes `/ml/training-dataset` and `/ml/monitoring`.
- `backend/src/services/mlDatasetService.js` now computes calibration, drift, missingness, cohort, and Tanzania-priority coverage sections in the monitoring snapshot.
- The monitoring math is implemented, and the frontend monitoring views now consume it through the shared query layer instead of manual fetch orchestration, but the most meaningful calibration and drift interpretation still depends on real pilot-facility data replacing the current synthetic artifacts.

Deliverables:
- Add calibration metrics, cohort slicing, drift indicators, and disease-specific coverage checks.
- Expose thresholds that can trigger operational review.

Progress in repo:
- Added calibration metrics including Brier score, expected calibration error, max calibration gap, and probability-bin summaries.
- Added cohort slices for gender, facility, prediction tier, and Tanzania-priority condition cohorts.
- Added temporal drift monitoring for readmission rate, prediction probability, fallback rate, and feature completeness, plus threshold-based operational review flags.
- Added Tanzania-priority coverage summaries for malaria, HIV/ART, TB, SAM, sickle cell disease, and neonatal-risk signals in one snapshot.
- Local verification passed for JS syntax checks and a direct monitoring smoke test against the repo’s current dataset export path.

Done when:
- Monitoring answers fallback rate, calibration quality, missingness, drift, and Tanzania-feature coverage in one place.

## 10. Real-Data Retraining and Clinical Validation

Status: `partial`

Why this is the final MVP gate:
- It is the point where the platform becomes clinically defensible instead of just technically functional.

Current repo state:
- Training and ingestion code now exist, and `ml-service/scripts/retrain_and_validate_real_data.py` now provides an end-to-end validation harness for the final gate.
- The committed artifacts are still synthetic-data artifacts because no real pilot-facility extract has been run through the final gate yet.

Deliverables:
- Retrain on de-identified real admissions.
- Validate on temporal holdout.
- Review calibration and safety thresholds before any clinical rollout.

Progress in repo:
- Added an end-to-end retrain-and-validate script that accepts a raw backend export or normalized CSV, retrains the temporal model, and writes a clinical validation report with gate checks and sign-off steps.
- Added Brier score to training metadata so calibration quality is included directly in the final validation gate.
- Added focused unit coverage for the new gate logic and a full smoke run of the harness on the bundled dataset path using temporary output directories.
- Updated `ml-service/README.md` with the final pilot workflow and the clinical validation gate invocation.

Done when:
- Synthetic artifacts are replaced.
- Temporal evaluation on real data meets the agreed clinical threshold.
- Pilot validation sign-off is documented.

Remaining external dependency:
- Requires a de-identified pilot-facility dataset and formal clinical review to move from `partial` to `done`.

## 11. Hierarchy Truth, DHIS2 Interactive Demo, and Sandbox Separation

Status: `partial`

Why this phase matters:
- The current strategic direction requires TRIP to treat DHIS2 as the hierarchy and aggregate context layer rather than as patient-level operational data.
- The working system needed a clean split between workspace scope, operational records, and safe demo/sandbox behavior.
- RHMT, CHMT, MoH, and ML roles need to see the correct level of the health system without inheriting stale facility labels or over-broad patient access.

Current repo state:
- A dedicated workspace-scope backend and frontend layer now exists.
- DHIS2 hierarchy data can now be browsed as an in-app navigation model instead of only appearing as sync counts.
- Aggregate analytics and ML-monitoring surfaces now honor the selected hierarchy scope and can switch into an admin-only sandbox mode without mixing demo behavior into normal operations.
- Patient/task/discharge care workflows still stay on the existing operational path for safety; sandbox mode does not yet replace those facility-care flows.

Deliverables completed in this phase:
- Added `GET /api/workspace/context` to expose the user role, allowed hierarchy scope, default facility source, and allowed operational modes.
- Added role-filtered DHIS2 hierarchy endpoints:
  - `GET /api/integrations/dhis2/tree`
  - `GET /api/integrations/dhis2/facilities`
- Added a dedicated frontend `WorkspaceProvider` so the shell, dashboards, analytics, and settings all read from the same scope contract instead of leaking facility identity from patient state.
- Added an interactive workspace scope bar for roles that can browse hierarchy or switch operational mode.
- Updated MoH, RHMT, CHMT, analytics, and ML-monitoring views so they follow the active hierarchy scope and no longer rely on stale shell labels.
- Added a safe aggregate-level sandbox overlay for `moh` and `ml_engineer` so demo hierarchy and model-practice workflows can be exercised without contaminating normal operational data.
- Added a manual DHIS2 hierarchy import action in Settings so synced demo facilities become visible and usable in the workspace.

Done when:
- Shell labels always match the active hierarchy scope.
- DHIS2 demo hierarchy is interactive for the roles allowed to browse it.
- Sandbox mode stays clearly separated from normal operational data.
- Aggregate dashboards and ML monitoring respect selected hierarchy scope without widening access.

Future roadmap after this phase:
- Add district assignment fields on users for exact CHMT scoping.
- Add ward assignment fields for clinician and nurse precision.
- Add zonal hierarchy support and HFR as a canonical facility-source option.
- Add real Tanzania DHIS2 credentials and mediator connectors for GoT-HoMIS / Afya eHMS.
- Add deeper offline-first support and optional local inference for low-connectivity sites.

Do not implement yet:
- DHIS2 indicator write-back
- In-process scheduler/cron inside the app runtime
- Full national role taxonomy rewrite
- Mixing sandbox records into normal operational tables
- Treating DHIS2 org-unit data itself as patient-level ML training data

## 12. MVP Close-Out Slice Tracker

Status: `active roadmap`

Use this section as the next-session tracker after the current hierarchy phase. These slices are ordered to finish the MVP without destabilizing the working system.

### Slice 12A. Production Schema Reconciliation

Status: `partial`

Goal:
- Remove the remaining compatibility-only behavior in production by reconciling the live Prisma schema with the fields and tables the current app already expects.

Focus:
- Alert persistence
- Newer facility metadata
- Any compatibility fallbacks still masking old production schema state

Progress update on 2026-03-28:
- Added explicit schema capability detection in `backend/src/lib/prisma.js` so the live app now knows whether the database supports encrypted-patient metadata, DHIS2 facility columns, structured visit payloads, prediction ML metadata, and the alert table.
- Extended `backend/src/services/systemHealth.js` so `/api/health` and `/api/ready` now include a dedicated `schema` service block with compatibility status, missing feature support, and a checked timestamp.
- Surfaced production schema compatibility in `src/pages/SettingsPage.jsx` for MoH and ML engineer roles so operators can see whether the deployed database is fully aligned or still using compatibility fallbacks.
- Verification status:
  - `node --check backend/src/lib/prisma.js`
  - `node --check backend/src/services/systemHealth.js`
  - frontend `lint`
  - frontend `build`

Done when:
- The production database natively supports the current app contract and compatibility fallbacks are reduced.

### Slice 12B. End-to-End High-Risk Workflow Verification

Status: `planned`

Goal:
- Prove one complete workflow from prediction through discharge, task creation, alerting, and audit trail without manual debugging.

Focus:
- Discharge workflow
- Risk scoring
- Task generation
- Alert persistence
- Audit visibility

Done when:
- At least one clinician-to-follow-up workflow passes end to end in the deployed app.

### Slice 12C. Live Notification Completion

Status: `planned`

Goal:
- Finish the operational notification path now that the gateway abstraction exists.

Focus:
- Configure `ALERT_SMS_RECIPIENTS`
- Run a real provider smoke test
- Confirm alert-to-SMS audit visibility

Done when:
- A live high-risk alert can produce a verified outbound SMS delivery attempt without crashing the alert flow.

### Slice 12D. ML Runtime Decision for MVP

Status: `planned`

Goal:
- Choose the true MVP inference mode and make the app honest about it.

Focus:
- Either deploy the external ML service properly
- Or intentionally ship `fallback_only` as the MVP runtime mode

Done when:
- `/api/health` reflects the chosen production ML mode and the UI copy matches reality.

### Slice 12E. Role Precision and Hierarchy Refinement

Status: `planned`

Goal:
- Tighten the remaining role-scope approximations without forcing a disruptive role-model rewrite.

Focus:
- District assignment fields for CHMT
- Ward assignment fields for clinician and nurse
- Better shell labels and hierarchy drill-down semantics where needed

Done when:
- RHMT, CHMT, clinician, and nurse scopes are enforceable with fewer inferred fallbacks.

### Slice 12F. Dashboard Polish and Inert Control Cleanup

Status: `planned`

Goal:
- Remove placeholder or misleading controls and finish the highest-impact workflow polish.

Focus:
- Buttons that do not currently perform useful actions
- Low-value placeholder cards
- Notification and settings affordances
- Profile and identity treatment without pretending unsupported features exist

Done when:
- Core role dashboards feel coherent and no primary control appears clickable without purpose.

### Slice 12G. Real-Data Activation and Clinical Readiness

Status: `blocked externally`

Goal:
- Move from technically ready to clinically credible.

Focus:
- De-identified pilot-facility dataset
- Real-data ingestion and temporal retraining
- Final validation gate
- Clinical review and sign-off

Done when:
- Synthetic artifacts are replaced and the model passes the agreed validation threshold on real data.

## Recommended First Build Slice

Start with Step 1, then Step 2.

Reason:
- Step 1 gives us a stable verification environment for every later backend change.
- Step 2 gives fast visible progress in the product without waiting on external stakeholders.
- Step 4 should follow immediately after those because it is the most important safety gap for any real-data path.

## Implementation Cadence

For every slice we implement:

1. Re-read the target files and confirm the repo state has not changed.
2. Make the smallest complete change that delivers one usable capability.
3. Run the narrowest verification available.
4. Update this file with `done`, `partial`, or `blocked` before moving to the next slice.

## How These Workflow Guides Map to TRIP

- For UI/UX work:
  - Use `frontend-patterns` plus the `multi-frontend` phase structure.
  - Default goals: responsive layouts, accessible interactions, meaningful loading/error states, and lean client-side data fetching.
- For model/training work:
  - Use `python-patterns` for code quality and `eval-harness` for measurable pass/fail gates before and after training changes.
  - Default goals: reproducible scripts, explicit metadata, safe fallbacks, and regression visibility.
- For release and environment work:
  - Use `deployment-patterns` to shape Docker, health checks, env validation, and rollout readiness.
- For every completed slice:
  - Use `verify` plus `verification-loop` before moving to the next slice.
