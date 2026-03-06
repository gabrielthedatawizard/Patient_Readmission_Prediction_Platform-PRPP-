/**
 * TRIP Platform - Backend Server
 * Express app is exported so it can run both locally and as a Vercel function.
 */

const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');

const authRoutes = require('./src/routes/auth');
const patientsRoutes = require('./src/routes/patients');
const predictionsRoutes = require('./src/routes/predictions');
const tasksRoutes = require('./src/routes/tasks');
const alertsRoutes = require('./src/routes/alerts');
const analyticsRoutes = require('./src/routes/analytics');
const auditRoutes = require('./src/routes/audit');
const syncRoutes = require('./src/routes/sync');

try {
  require('dotenv').config();
} catch (error) {
  // dotenv is optional in serverless deployments where env vars are injected by platform.
}

const app = express();
const PORT = Number(process.env.PORT) || 5000;
const IS_PRODUCTION = process.env.NODE_ENV === 'production';
app.set('wss', null);

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
  ...configuredOrigins.filter((origin) => origin !== '*')
]);

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
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  next();
});
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'TRIP Backend API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    services: {
      auth: 'up',
      patients: 'up',
      predictions: 'up',
      tasks: 'up',
      alerts: 'up',
      analytics: 'up',
      audit: 'up',
      sync: 'up'
    },
    resilience: {
      offlineFallbackEnabled: true,
      localRulesModelEnabled: true
    }
  });
});

app.get('/api', (req, res) => {
  res.json({
    name: 'TRIP Platform API',
    version: '2.3.0',
    description: 'Tanzania Readmission Intelligence Platform',
    endpoints: {
      health: '/api/health',
      auth: '/api/auth',
      patients: '/api/patients',
      predictions: '/api/predictions',
      tasks: '/api/tasks',
      alerts: '/api/alerts',
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
app.use('/api/analytics', analyticsRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/sync', syncRoutes);

app.use((err, req, res, next) => {
  if (err.message && err.message.startsWith('CORS blocked')) {
    return res.status(403).json({
      error: 'Forbidden',
      message: err.message
    });
  }

  console.error(err.stack);
  return res.status(500).json({
    error: 'Internal Server Error',
    message: err.message
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
