# TRIP Platform Deployment Guide (Vercel & Docker)

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

Demo-only fallback:

- If you intentionally deploy the public memory-backed demo with `TRIP_DATA_PROVIDER=memory`, login can still work without `JWT_SECRET`.
- In that mode TRIP uses a built-in demo JWT secret only for non-PHI sample data; set `ALLOW_DEMO_AUTH_IN_PRODUCTION=false` to disable this fallback.
- For Prisma-backed or real-data deployments, always configure `JWT_SECRET`.

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

## 5. Docker Compose Deployment (Self-Hosted Production)

Instead of Vercel, you can deploy the complete platform on a single server (like a VPS or internal hospital server) using Docker Compose. The repository contains a comprehensive docker-compose.yml that provisions:
- PostgreSQL database
- ML Model Service container
- Express Backend API
- Nginx-served Frontend SPA

### Prerequisites
- Docker and Docker Compose installed
- `nginx.conf` and `Dockerfile` exist in the root
- `backend/Dockerfile` and `ml-service/Dockerfile` exist

### Steps
1. Create a `.env` file in the root based on the environment variables defined above:
   ```bash
   NODE_ENV=production
   TRIP_DATA_PROVIDER=prisma
   TRIP_STRICT_DATA_PROVIDER=true
   JWT_SECRET=your-strong-production-jwt-secret
   ENCRYPTION_KEY=your-strong-production-encryption-key-32-chars
   POSTGRES_PASSWORD=your-secure-db-password
   ```

2. Note: The default `docker-compose.yml` mounts code for local development (`trip-local`). To run a pure production instance, remove the volume mounts for the backend and frontend services from `docker-compose.yml`, or copy the production compose configuration if provided in a separate file (e.g., `docker-compose.prod.yml`).

3. Start the stack:
   ```bash
   docker-compose build
   docker-compose up -d
   ```

4. Verify health:
   ```bash
   curl http://localhost:5000/api/health
   ```

5. The platform will be accessible on port 3000 (frontend) by default, or port 80 if utilizing the production multi-stage Dockerfile configuration for nginx routing.

## Notes

- Use the pooled Supabase URL for `DATABASE_URL` entirely if using Vercel.
- Vercel serverless functions do not provide a persistent WebSocket server; use polling or explicit refresh for realtime-sensitive views.
- SMS alerts are safer when routed to operational escalation contacts via `ALERT_SMS_TARGET_MODE=operations`. Switch to patient-targeted SMS only if that workflow is explicitly approved.
