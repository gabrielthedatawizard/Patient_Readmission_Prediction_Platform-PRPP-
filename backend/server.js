/**
 * TRIP Platform - Backend Server
 * Express app is exported so it can run both locally and as a Vercel function.
 */

try {
  require('dotenv').config();
} catch (error) {
  // dotenv is optional in serverless deployments where env vars are injected by platform.
}

const express = require('express');
const http = require('http');
const { randomUUID } = require('crypto');
const cors = require('cors');
const helmet = require('helmet');

const authRoutes = require('./src/routes/auth');
const patientsRoutes = require('./src/routes/patients');
const predictionsRoutes = require('./src/routes/predictions');
const tasksRoutes = require('./src/routes/tasks');
const alertsRoutes = require('./src/routes/alerts');
const chwRoutes = require('./src/routes/chw');
const analyticsRoutes = require('./src/routes/analytics');
const auditRoutes = require('./src/routes/audit');
const syncRoutes = require('./src/routes/sync');
const { buildHealthSnapshot, isPlatformReady } = require('./src/services/systemHealth');

const app = express();
const PORT = Number(process.env.PORT) || 5000;
const IS_PRODUCTION = process.env.NODE_ENV === 'production';
app.set('wss', null);

function createRequestId() {
  if (typeof randomUUID === 'function') {
    return randomUUID();
  }

  return `req-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeOrigin(origin) {
  return String(origin || '')
    .trim()
    .replace(/\/$/, '');
}

function resolveVercelOrigin(value) {
  const normalized = normalizeOrigin(value);

  if (!normalized) {
    return null;
  }

  if (normalized.startsWith('https://') || normalized.startsWith('http://')) {
    return normalized;
  }

  return `https://${normalized}`;
}

const configuredOrigins = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map((origin) => normalizeOrigin(origin))
  .filter(Boolean);
const allowAllOrigins = configuredOrigins.includes('*');

const allowedOrigins = new Set([
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  normalizeOrigin(process.env.FRONTEND_URL),
  ...configuredOrigins.filter((origin) => origin !== '*')
].filter(Boolean));

const vercelOrigins = [
  process.env.VERCEL_URL,
  process.env.VERCEL_BRANCH_URL,
  process.env.VERCEL_PROJECT_PRODUCTION_URL
]
  .map(resolveVercelOrigin)
  .filter(Boolean);

vercelOrigins.forEach((origin) => allowedOrigins.add(origin));

app.disable('x-powered-by');
app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        defaultSrc: ["'self'"],
        baseUri: ["'self'"],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"],
        formAction: ["'self'"],
        connectSrc: ["'self'", 'https:', 'wss:']
      }
    },
    hsts: IS_PRODUCTION
      ? {
          maxAge: 31536000,
          includeSubDomains: true,
          preload: true
        }
      : false,
    crossOriginEmbedderPolicy: false
  })
);
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowAllOrigins) {
        return callback(null, true);
      }

      if (allowedOrigins.has(normalizeOrigin(origin))) {
        return callback(null, true);
      }

      return callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: !allowAllOrigins,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  })
);
app.use((req, res, next) => {
  const requestId = String(req.headers['x-request-id'] || createRequestId());
  req.requestId = requestId;
  res.setHeader('X-Request-Id', requestId);
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  if (req.path.startsWith('/api/')) {
    res.setHeader('Cache-Control', 'no-store');
  }
  next();
});
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/api/health', async (req, res, next) => {
  try {
    const snapshot = await buildHealthSnapshot();

    return res.json({
      status: isPlatformReady(snapshot) ? 'OK' : 'DEGRADED',
      message: 'TRIP Backend API is running',
      timestamp: new Date().toISOString(),
      ...snapshot
    });
  } catch (error) {
    return next(error);
  }
});

app.get('/api/ready', async (req, res, next) => {
  try {
    const snapshot = await buildHealthSnapshot();
    const ready = isPlatformReady(snapshot);

    return res.status(ready ? 200 : 503).json({
      status: ready ? 'READY' : 'NOT_READY',
      timestamp: new Date().toISOString(),
      ...snapshot
    });
  } catch (error) {
    return next(error);
  }
});

app.get('/api', (req, res) => {
  res.json({
    name: 'TRIP Platform API',
    version: '2.3.0',
    description: 'Tanzania Readmission Intelligence Platform',
    endpoints: {
      health: '/api/health',
      ready: '/api/ready',
      auth: '/api/auth',
      patients: '/api/patients',
      predictions: '/api/predictions',
      tasks: '/api/tasks',
      alerts: '/api/alerts',
      chw: '/api/chw',
      analytics: '/api/analytics',
      audit: '/api/audit',
      sync: '/api/sync'
    }
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/patients', patientsRoutes);
app.use('/api/predictions', predictionsRoutes);
app.use('/api/tasks', tasksRoutes);
app.use('/api/alerts', alertsRoutes);
app.use('/api/chw', chwRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/sync', syncRoutes);

app.use((err, req, res, next) => {
  if (err.message && err.message.startsWith('CORS blocked')) {
    return res.status(403).json({
      error: 'Forbidden',
      message: err.message,
      requestId: req.requestId || null
    });
  }

  const statusCode =
    Number.isInteger(err.statusCode) && err.statusCode >= 400
      ? err.statusCode
      : Number.isInteger(err.status) && err.status >= 400
        ? err.status
        : 500;

  console.error(`[${req.requestId || 'unknown-request'}]`, err.stack || err);
  return res.status(statusCode).json({
    error: statusCode >= 500 ? 'Internal Server Error' : 'Request Failed',
    message:
      statusCode >= 500 && IS_PRODUCTION
        ? 'An unexpected server error occurred.'
        : err.message,
    requestId: req.requestId || null
  });
});

app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`
  });
});

if (require.main === module) {
  const server = http.createServer(app);

  try {
    // Lazy-load websocket dependency only for runtime server boot.
    // eslint-disable-next-line global-require
    const TripWebSocketServer = require('./src/services/websocketServer');
    const wss = new TripWebSocketServer(server);
    app.set('wss', wss);
  } catch (error) {
    console.warn('WebSocket server disabled:', error.message);
  }

  server.listen(PORT, () => {
    console.log(`TRIP Backend API running on http://localhost:${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`API docs: http://localhost:${PORT}/api`);
  });
}

module.exports = app;
