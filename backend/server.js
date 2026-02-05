/**
 * TRIP Platform - Backend Server
 * Main entry point for the Express.js API server
 */

const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const helmet = require('helmet');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(helmet());

// CORS configuration for production
const corsOptions = {
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};
app.use(cors(corsOptions));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'TRIP Backend API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Root endpoint
app.get('/api', (req, res) => {
  res.json({
    name: 'TRIP Platform API',
    version: '2.3.0',
    description: 'Tanzania Readmission Intelligence Platform',
    endpoints: {
      health: '/api/health',
      patients: '/api/patients',
      auth: '/api/auth',
      predictions: '/api/predictions'
    }
  });
});

// Placeholder API routes (to be implemented)
app.get('/api/patients', (req, res) => {
  res.json({
    message: 'Patients endpoint - to be implemented',
    status: 'ready'
  });
});

app.post('/api/auth/login', (req, res) => {
  res.json({
    message: 'Authentication endpoint - to be implemented',
    status: 'ready'
  });
});

app.get('/api/predictions/:patientId', (req, res) => {
  res.json({
    message: 'Risk prediction endpoint - to be implemented',
    status: 'ready',
    patientId: req.params.patientId
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║                      TRIP Backend API                      ║
║         Tanzania Readmission Intelligence Platform         ║
╚════════════════════════════════════════════════════════════╝

✓ Server running on: http://localhost:${PORT}
✓ Environment: ${process.env.NODE_ENV || 'development'}
✓ API Documentation: http://localhost:${PORT}/api

Ready to receive requests...
  `);
});
