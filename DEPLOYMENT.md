# TRIP Platform Deployment Guide (Vercel)

This repository is configured to deploy **frontend + backend API** together on Vercel.

## Architecture

- Frontend: Vite static build (`build/`)
- Backend: Express API via Vercel Serverless Function (`api/index.js`)
- API base path: `/api`
- Default production data mode: Prisma + PostgreSQL/Supabase

## What Is Configured

- `vercel.json`
  - Installs root and backend dependencies during deploy
  - Generates Prisma client for the backend before build
  - Builds frontend from `package.json`
  - Builds API from `api/index.js`
  - Routes `/api/*` to Express
  - Bundles Prisma client artifacts for the API function
  - SPA fallback routes to `index.html`
  - Uses Vercel Node.js serverless runtime defaults for the API function
- `backend/server.js`
  - Exports Express app for local + serverless use
  - Supports Vercel hostnames in CORS automatically
  - Treats `dotenv` as optional at runtime
- Frontend runtime
  - Disables WebSocket transport on Vercel because the serverless API is request/response only
- `.env.production`
  - Frontend API points to `/api`
  - Frontend variables use `VITE_` prefixes

## 1. Local Verification

```bash
npm run build
node -e "const app=require('./api/index'); const server=app.listen(5050,()=>console.log('api on 5050'));"
```

Health check:

```bash
http://localhost:5050/api/health
```

## 2. Deploy to Vercel

### Dashboard method

1. Push this repo to GitHub.
2. Import the repo in Vercel.
3. Framework preset: **Other** (Vercel will use `vercel.json`).
4. Deploy.

### CLI method

```bash
npm i -g vercel
vercel login
vercel --prod
```

## 3. Environment Variables (Vercel)

Set these in Vercel Project Settings:

Required:

- `NODE_ENV=production`
- `JWT_SECRET=<strong-random-secret>`
- `ENCRYPTION_KEY=<strong-random-secret>`
- `TRIP_DATA_PROVIDER=prisma`
- `TRIP_STRICT_DATA_PROVIDER=true`
- `DATABASE_URL=<supabase pooled url>`
- `DIRECT_URL=<supabase direct url>`

Recommended:

- `CORS_ORIGIN=https://your-domain.vercel.app` (or custom domain)
- `FRONTEND_URL=https://your-domain.vercel.app`
- `JWT_EXPIRES_IN=8h`
- `ML_RUNTIME_MODE=fallback_only` if you are intentionally shipping the local rules engine, or `auto` / `external_required` when a real external ML service is deployed
- `ML_FALLBACK_ENABLED=true`

Optional SMS escalation:

- `ALERT_SMS_ENABLED=true`
- `ALERT_SMS_PROVIDER=africastalking`
- `ALERT_SMS_TARGET_MODE=operations`
- `ALERT_SMS_RECIPIENTS=+255700000001,+255700000002`
- `AFRICAS_TALKING_ENV=live`
- `AFRICAS_TALKING_USERNAME=<your-africas-talking-username>`
- `AFRICAS_TALKING_API_KEY=<your-africas-talking-api-key>`
- `AFRICAS_TALKING_SENDER_ID=<approved-sender-id>`

Optional DHIS2 facility sync:

- `DHIS2_BASE_URL=https://dhis2.example.org`
- `DHIS2_USERNAME=<service-account-username>`
- `DHIS2_PASSWORD=<service-account-password>`
- `DHIS2_ROOT_ORG_UNIT=<optional-root-org-unit-id>`
- `DHIS2_FACILITY_LEVELS=4,5,6`
- `DHIS2_REGION_LEVEL=2`
- `DHIS2_DISTRICT_LEVEL=3`
- `DHIS2_LEVEL_MAP={"5":"regional_referral","6":"district"}`
- `DHIS2_TIMEOUT_MS=10000`

Optional frontend override:

- `VITE_API_URL=/api`
- `VITE_DISABLE_WEBSOCKETS=true`

## 4. Post-Deployment Checks

- `https://your-domain.vercel.app/` loads frontend
- `https://your-domain.vercel.app/api/health` returns `status: OK` or `DEGRADED`
- `https://your-domain.vercel.app/api/ready` returns `status: READY`
- Login succeeds using seeded credentials, for example:
  - Email: `clinician@trip.go.tz`
  - Password: `Trip@2026`
- If DHIS2 is configured, `GET /api/integrations/dhis2/status` returns a configured snapshot for `moh` or `ml_engineer` users
- `GET /api/health` should show the intended ML runtime mode explicitly:
  - `fallback_only` when the rules engine is the chosen MVP runtime
  - `up` with `runtimeMode=external_ml` or `external_with_fallback` when an external service is active

## Notes

- Use the pooled Supabase URL for `DATABASE_URL`.
- Use the direct Supabase database host for `DIRECT_URL` when running Prisma migrations.
- Vercel serverless functions do not provide a persistent WebSocket server; use polling or explicit refresh for realtime-sensitive views.
- SMS alerts are safer when routed to operational escalation contacts via `ALERT_SMS_TARGET_MODE=operations`. Switch to patient-targeted SMS only if that workflow is explicitly approved.
