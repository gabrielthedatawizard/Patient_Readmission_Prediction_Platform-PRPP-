# Project Organization Guide

## Current Structure

TRIP uses a single repo with the frontend at the root and the backend in `backend/`.

```text
.
├── api/                    # Vercel serverless entry that wraps the backend app
├── backend/
│   ├── prisma/             # Prisma schema, seed, migrations, notes
│   ├── scripts/            # Verification helpers and automation
│   ├── src/
│   │   ├── config/         # Backend configuration data
│   │   ├── data/           # Memory + Prisma data providers
│   │   ├── e2e/            # Backend end-to-end tests
│   │   ├── lib/            # Shared backend helpers
│   │   ├── middleware/     # Auth and authorization middleware
│   │   ├── routes/         # Express route handlers
│   │   ├── services/       # Risk engine, analytics, notifications, websockets
│   │   └── utils/          # Backend utilities
│   ├── .env.example
│   ├── jest.config.js
│   ├── package.json
│   └── server.js
├── public/                 # Static public assets
├── src/
│   ├── components/         # Shared UI components
│   ├── config/             # Frontend config and translations
│   ├── context/            # React providers
│   ├── dashboards/         # Role-specific dashboard screens
│   ├── data/               # Frontend seed data and constants
│   ├── design-system/      # Shared UI primitives and tokens
│   ├── hooks/              # Frontend hooks
│   ├── pages/              # Landing and login pages
│   ├── services/           # API, websocket, analytics, offline, feature flags
│   ├── styles/             # Global styles
│   ├── App.jsx
│   └── main.jsx
├── .env.example
├── package.json
├── README.md
├── QUICK_START.md
├── SETUP.md
├── API_INTEGRATION.md
├── DEPLOYMENT.md
└── ORGANIZATION_GUIDE.md
```

## Runtime Model

- The frontend is a Vite app served from the repo root.
- The backend is an Express app exported from `backend/server.js`.
- `api/index.js` reuses that backend app for Vercel deployment.
- Data storage supports two modes:
  - `memory` for demo and local validation
  - `prisma` for PostgreSQL-backed persistence

## Local Development

Frontend:

```bash
npm install
npm start
```

Backend:

```bash
cd backend
npm install
npm start
```

## Environment Files

Frontend `.env`:

```env
VITE_API_URL=http://localhost:5000/api
VITE_WS_URL=ws://localhost:5000
PORT=3000
```

Backend `backend/.env`:

```env
NODE_ENV=development
PORT=5000
TRIP_DATA_PROVIDER=memory
JWT_SECRET=change-me-for-production
JWT_EXPIRES_IN=8h
FRONTEND_URL=http://localhost:3000
CORS_ORIGIN=http://localhost:3000
```

## Verification

- Frontend build: `npm run build`
- Frontend lint: `npm run lint`
- Backend unit tests: `cd backend && npm test`
- Prisma verification: `cd backend && npm run phase2:verify`

## Ownership Guide

- `src/`: user-facing experience, dashboards, styling, offline behavior
- `backend/src/routes/`: API surface and request validation
- `backend/src/data/`: storage behavior and row-level access rules
- `backend/src/services/`: domain logic such as risk scoring, analytics, and notifications
- `backend/prisma/`: persistence schema and seed data

## Notes

- Root `npm test` is still a placeholder; backend tests are the currently active automated suite.
- Memory mode includes seeded demo users such as `clinician@trip.go.tz`.
- Prisma mode is the path for persistent environments and requires `DATABASE_URL`.
