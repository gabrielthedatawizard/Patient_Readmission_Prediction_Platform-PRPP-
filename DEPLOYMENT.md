# TRIP Platform Deployment Guide (Vercel)

This repository is configured to deploy **frontend + backend API** together on Vercel.

## Architecture

- Frontend: Create React App static build (`build/`)
- Backend: Express API via Vercel Serverless Function (`api/index.js`)
- API base path: `/api`
- Default data mode: in-memory (`TRIP_DATA_PROVIDER=memory`)

## What Is Configured

- `vercel.json`
  - Builds frontend from `package.json`
  - Builds API from `api/index.js`
  - Routes `/api/*` to Express
  - SPA fallback routes to `index.html`
  - Uses Node.js 20 runtime for the API function
- `backend/server.js`
  - Exports Express app for local + serverless use
  - Supports Vercel hostnames in CORS automatically
  - Treats `dotenv` as optional at runtime
- `.env.production`
  - Frontend API points to `/api`
  - Build disables CRA ESLint plugin (`DISABLE_ESLINT_PLUGIN=true`) to avoid CI warning failures

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

Recommended:

- `CORS_ORIGIN=https://your-domain.vercel.app` (or custom domain)
- `TRIP_DATA_PROVIDER=memory`
- `JWT_EXPIRES_IN=8h`

Optional frontend override:

- `REACT_APP_API_URL=/api`

## 4. Post-Deployment Checks

- `https://your-domain.vercel.app/` loads frontend
- `https://your-domain.vercel.app/api/health` returns `status: OK`
- Login succeeds using demo credentials (memory mode), for example:
  - Email: `clinician@trip.go.tz`
  - Password: `Trip@2026`

## Notes

- Memory mode is suitable for demos and validation; data resets when serverless instances recycle.
- For persistent deployments, switch to `TRIP_DATA_PROVIDER=prisma` and set a production PostgreSQL `DATABASE_URL`.
