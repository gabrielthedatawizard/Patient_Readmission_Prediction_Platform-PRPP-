# TRIP - Tanzania Readmission Intelligence Platform

TRIP is a healthcare decision-support platform focused on reducing preventable 30-day readmissions through risk scoring, discharge workflows, and operational dashboards.

## Stack

- Frontend: React 18 + Vite + Tailwind (`src/`)
- Backend API: Express (`backend/`), deployed as Vercel Function via `api/index.js`
- Data mode: In-memory by default, Prisma/PostgreSQL ready in backend
- Deployment: Vercel (`vercel.json`)

## Core Features

- Role-aware user experience (MoH, RHMT, CHMT, facility, clinical, CHW personas)
- Risk scoring UX with low/medium/high tiers and intervention guidance
- Discharge workflow and follow-up planning
- Analytics and task views
- English + Swahili localization support

## Repository Layout

```text
.
├── api/                    # Vercel function entry (wraps backend app)
├── backend/                # Express API + Prisma
├── public/                 # Static public files (manifest, robots)
├── src/                    # Frontend source
├── index.html              # Vite HTML entry
├── vite.config.mjs         # Vite config (proxy + build dir)
├── vercel.json             # Vercel routes/build/functions config
├── QUICK_START.md
├── SETUP.md
├── API_INTEGRATION.md
└── DEPLOYMENT.md
```

## Prerequisites

- Node.js `20.19+` (required)
- npm `9+`
- Git

## Quick Start (Frontend)

```bash
npm install
cp .env.example .env
npm start
```

Open `http://localhost:3000`.

## Local Full Stack (Frontend + Backend)

Terminal 1:
```bash
npm start
```

Terminal 2:
```bash
cd backend
npm install
cp .env.example .env
npm start
```

Backend default URL: `http://localhost:5000`
Health check: `http://localhost:5000/api/health`

## Environment Variables

Frontend (`.env`, Vite format):
- `VITE_API_URL` (example: `/api` in production, or `http://localhost:5000/api` locally)
- Additional optional `VITE_*` flags are documented in `.env.example`

Backend (`backend/.env`):
- `JWT_SECRET` (required outside demo)
- `CORS_ORIGIN`
- `TRIP_DATA_PROVIDER` (`memory` or `prisma`)
- `DATABASE_URL` (required when using `prisma`)

## Scripts

Root:
- `npm start` / `npm run dev`: start Vite dev server
- `npm run build`: production build to `build/`
- `npm run preview`: preview production build
- `npm run lint`: lint frontend
- `npm run format`: format frontend files

Backend (`cd backend`):
- `npm start`: start API
- `npm run dev`: start API with nodemon
- `npm test`: run backend tests
- `npm run prisma:migrate:deploy`: apply Prisma migrations

## Deploy (Vercel)

This repo is configured for full-stack deployment on Vercel:
- Frontend static build output: `build/`
- API routing: `/api/* -> api/index.js`

Required Vercel environment variables:
- `NODE_ENV=production`
- `JWT_SECRET=<strong-random-secret>`

See [DEPLOYMENT.md](./DEPLOYMENT.md) for the detailed flow.

## Documentation

- [QUICK_START.md](./QUICK_START.md)
- [SETUP.md](./SETUP.md)
- [API_INTEGRATION.md](./API_INTEGRATION.md)
- [DEPLOYMENT.md](./DEPLOYMENT.md)
- [ORGANIZATION_GUIDE.md](./ORGANIZATION_GUIDE.md)

## GitHub Contribution Graph Troubleshooting

If commits are on GitHub but not showing on your contributions calendar, the most common causes are:

1. Commit email mismatch
- The email in your commits must be verified in your GitHub account.
- Check with:
```bash
git log -1 --pretty=format:'%an <%ae>'
```
- Compare `%ae` with your verified email(s) in GitHub Settings.

2. Wrong branch
- GitHub counts commits on the repository default branch (usually `main`) or `gh-pages`.
- Commits only on side branches may not count until merged.

3. Fork behavior
- Commits on forks generally do not count the same way as commits on the original repository unless specific conditions are met.

4. Private contribution visibility
- If the repo is private, enable **Include private contributions** in GitHub profile settings.

5. Fresh push delay
- Contribution graph updates can take a few minutes.

Useful checks:
```bash
git branch --show-current
git remote -v
git log --oneline -n 5
```

## License

MIT
