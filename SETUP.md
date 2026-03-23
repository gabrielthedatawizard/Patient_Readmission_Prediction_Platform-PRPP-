# TRIP Platform - Setup Guide

## Prerequisites

Before you begin, make sure you have:

- Node.js `20.19+`
- npm `9+`
- Git

### Verify Installation

```bash
node --version
npm --version
git --version
```

## Installation

### 1. Clone the repository

```bash
git clone https://github.com/moh-tanzania/trip-platform.git
cd trip-platform
```

### 2. Install dependencies

```bash
npm install
cd backend && npm install
```

### 3. Configure environment files

Frontend:

```bash
cp .env.example .env
```

Recommended local frontend env:

```env
VITE_API_URL=http://localhost:5000/api
VITE_WS_URL=ws://localhost:5000
PORT=3000
```

Backend:

```bash
cp backend/.env.example backend/.env
```

Recommended local backend env:

```env
NODE_ENV=development
PORT=5000
TRIP_DATA_PROVIDER=memory
JWT_SECRET=change-me-for-production
JWT_EXPIRES_IN=8h
FRONTEND_URL=http://localhost:3000
CORS_ORIGIN=http://localhost:3000
```

If you want persistent data instead of demo memory mode, also set:

```env
DATABASE_URL=postgresql://trip_user:trip_password@localhost:5432/trip_platform?schema=public
TRIP_DATA_PROVIDER=prisma
```

## Running the App

Terminal 1:

```bash
npm start
```

Terminal 2:

```bash
cd backend
npm start
```

Local URLs:

- Frontend: `http://localhost:3000`
- Backend: `http://localhost:5000`
- Health check: `http://localhost:5000/api/health`

## Verification

Frontend:

```bash
npm run build
npm run lint
```

Backend:

```bash
cd backend
npm test
```

Prisma-backed verification:

```bash
cd backend
npm run phase2:verify
```

## Current Project Structure

```text
.
├── api/                    # Vercel wrapper for backend
├── backend/                # Express API, Prisma, tests
├── public/                 # Static assets
├── src/                    # React frontend
├── README.md
├── QUICK_START.md
├── SETUP.md
├── API_INTEGRATION.md
├── DEPLOYMENT.md
└── ORGANIZATION_GUIDE.md
```

## Common Issues

### Node version is too old

TRIP uses Vite 7, which requires Node `20.19+`. If `npm run build` fails with a Node version message, upgrade Node first.

### Port 3000 or 5000 is already in use

Stop the conflicting process or launch the frontend with a different port:

```bash
npm run dev -- --port 3001
```

### Prisma tests fail immediately

Make sure `DATABASE_URL` is set and points to a reachable PostgreSQL instance before running Prisma migrations or e2e tests.

## Notes

- Root `npm test` is still a placeholder; frontend automated tests are not configured yet.
- Memory mode is the simplest local setup and includes seeded demo users and patients.
- The backend accepts both `JWT_EXPIRES_IN` and the legacy `JWT_EXPIRY`, but `JWT_EXPIRES_IN` is the preferred setting going forward.

## Getting Help

If you encounter issues:

1. Check this documentation
2. Review the root documentation files such as `README.md`, `API_INTEGRATION.md`, and `DEPLOYMENT.md`
3. Search GitHub Issues
4. Contact: trip-support@moh.go.tz

## Development Tips

### Hot Reload

The development server supports hot reload. Changes to files will automatically refresh the browser.

### Component Development

Use React DevTools extension for debugging:
- [Chrome](https://chrome.google.com/webstore/detail/react-developer-tools/fmkadmapgofadopljbjfkapdkoienihi)
- [Firefox](https://addons.mozilla.org/en-US/firefox/addon/react-devtools/)

### Code Organization

Follow these patterns:
- One component per file
- Named exports for utilities
- Default export for components
- Keep components small and focused

## Production Deployment

See `DEPLOYMENT.md` for detailed deployment instructions for:
- Government servers (on-premise)
- Cloud platforms (AWS, Azure, GCP)
- Docker containerization
- Kubernetes orchestration

---

**Ready to start developing!** 🚀

For more information, see the main [README.md](../README.md)
