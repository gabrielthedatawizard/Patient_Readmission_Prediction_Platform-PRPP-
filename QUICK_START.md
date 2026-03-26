# TRIP Platform - Quick Start Guide

## What is TRIP?

TRIP is the Tanzania Readmission Intelligence Platform: a full-stack healthcare decision-support app for readmission risk scoring, discharge coordination, operational dashboards, and follow-up planning.

## What You Get

- React 18 + Vite frontend at the repo root
- Express backend in `backend/`
- Vercel serverless wrapper in `api/index.js`
- Role-aware dashboards for MoH, RHMT, CHMT, facility, clinical, and CHW users
- English and Swahili localization
- Offline caching and sync queue support
- Memory mode for demos, plus optional Prisma/PostgreSQL mode

## Get Started in 3 Steps

Choose one of the two local paths below:

- Fastest demo path: frontend + backend in memory mode
- Recommended engineering path: full Docker Compose stack with PostgreSQL + ML service

### 1. Install dependencies

```bash
npm install
cd backend && npm install
```

### 2. Set up environment files

```bash
cp .env.example .env
cp backend/.env.example backend/.env
```

For the simplest demo path, edit `backend/.env` to use:

- `TRIP_DATA_PROVIDER=memory`
- `TRIP_STRICT_DATA_PROVIDER=false`

That demo setup uses:

- Frontend on `http://localhost:3000`
- Backend on `http://localhost:5000`
- In-memory demo data and seeded demo users

### 3. Run the app

Terminal 1:

```bash
npm start
```

Terminal 2:

```bash
cd backend
npm start
```

Open [http://localhost:3000](http://localhost:3000).

## Recommended Local Full Stack

For end-to-end backend, Prisma, and ML verification, use Docker Compose:

```bash
docker compose up --build
```

This starts:

- Frontend on `http://localhost:3000`
- Backend on `http://localhost:5000`
- ML service on `http://localhost:5001`
- PostgreSQL on `localhost:5432`

The Compose stack uses Prisma mode by default and runs:

- `npm run prisma:generate`
- `npm run prisma:migrate:deploy`
- `npm run prisma:seed`

Use this path when validating:

- Prisma-backed data access
- ML API integration and fallback behavior
- Role-based routes against a persistent database
- The Phase 2 verification flow

## Demo Accounts

In memory mode, demo users are available as `<role>@trip.go.tz` with password `Trip@2026`.

Examples:

- `moh@trip.go.tz`
- `clinician@trip.go.tz`
- `facility_manager@trip.go.tz`
- `chw@trip.go.tz`

## Explore Different Roles

- Facility Manager: facility operations and task oversight
- Clinician: patient risk prediction and discharge planning
- MoH National Admin: national KPIs and analytics
- CHW: mobile-friendly follow-up workflow

## Current Repository Layout

```text
.
├── api/                    # Vercel function entry
├── backend/                # Express API + Prisma + tests
├── public/                 # Static assets
├── src/                    # Frontend source
├── README.md               # Project overview
├── SETUP.md                # Detailed setup guide
├── API_INTEGRATION.md      # Integration guide
├── DEPLOYMENT.md           # Deployment guide
└── ORGANIZATION_GUIDE.md   # Repo layout guide
```

## Backend Integration

The frontend is already wired to the backend through:

- `src/services/runtimeConfig.js`
- `src/services/apiClient.js`
- `src/services/websocket.js`

For local development, set `VITE_API_URL=http://localhost:5000/api` in `.env`.

## Documentation

| Document | Description |
|----------|-------------|
| `README.md` | Overview, stack, and scripts |
| `SETUP.md` | Detailed local setup |
| `API_INTEGRATION.md` | API and client integration guidance |
| `DEPLOYMENT.md` | Vercel deployment notes |
| `ORGANIZATION_GUIDE.md` | Current repo layout and responsibilities |

## Available Scripts

Root:

```bash
npm start
npm run build
npm run lint
npm run format
```

Backend:

```bash
cd backend
npm start
npm test
npm run test:e2e:prisma
```

## Notes

- `npm test` at the repo root is still a placeholder; frontend automated tests are not configured yet.
- Prisma mode requires `DATABASE_URL`, `DIRECT_URL`, and `TRIP_DATA_PROVIDER=prisma`.
- The backend health check is available at `http://localhost:5000/api/health`.
- The backend readiness check is available at `http://localhost:5000/api/ready`.
- The ML service health check is available at `http://localhost:5001/health`.

*Reducing readmissions through intelligent technology*

**Version**: 2.3.0  
**Last Updated**: February 2025  
**License**: MIT  
**Ministry of Health, United Republic of Tanzania**
