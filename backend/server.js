/**
 * TRIP Platform - Backend Server
 * Express app is exported so it can run both locally and as a Vercel function.
 */

const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const helmet = require('helmet');

const authRoutes = require('./src/routes/auth');
const patientsRoutes = require('./src/routes/patients');
const predictionsRoutes = require('./src/routes/predictions');
const tasksRoutes = require('./src/routes/tasks');
const analyticsRoutes = require('./src/routes/analytics');
const auditRoutes = require('./src/routes/audit');

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 5000;
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:3000')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(helmet());
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  })
);
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
      analytics: 'up',
      audit: 'up'
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
      analytics: '/api/analytics',
      audit: '/api/audit'
    }
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/patients', patientsRoutes);
app.use('/api/predictions', predictionsRoutes);
app.use('/api/tasks', tasksRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/audit', auditRoutes);

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
  app.listen(PORT, () => {
    console.log(`TRIP Backend API running on http://localhost:${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`API docs: http://localhost:${PORT}/api`);
  });
}

module.exports = app;
