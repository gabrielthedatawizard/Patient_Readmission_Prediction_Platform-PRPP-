# TRIP Platform Deployment Guide (Vercel)

This repository is now configured to deploy **frontend + backend API** together on Vercel.

## Architecture

- Frontend: Create React App static build (`build/`)
- Backend: Express API served by Vercel Serverless Function (`api/index.js`)
- API base path: `/api`

## What Is Configured

- `vercel.json`
  - Builds frontend from `package.json`
  - Builds API from `api/index.js`
  - Routes `/api/*` to the Express app
  - SPA fallback routes to `index.html`
- `backend/server.js`
  - Exports the Express `app`
  - Still runs normally with `npm start` inside `backend/`
- `api/index.js`
  - Vercel entrypoint that reuses `backend/server.js`

## 1. Local Verification

### Frontend

```bash
npm start
```

### Backend

```bash
cd backend
npm start
```

Health check:

```bash
http://localhost:5000/api/health
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

- `NODE_ENV=production`
- `CORS_ORIGIN=https://your-project.vercel.app`
- `JWT_SECRET=your_strong_secret`
- `MONGODB_URI=your_connection_string` (if database is used)

Optional frontend override:

- `REACT_APP_API_URL=/api`

## 4. Post-Deployment Checks

- `https://your-project.vercel.app/` loads frontend
- `https://your-project.vercel.app/api/health` returns `status: OK`
- Browser network calls to `/api/*` return 200

## Notes

- `backend/.env.example` is included for local backend setup.
- If you want separate hosting for backend, keep `/api` pointing at that external URL via env vars.
