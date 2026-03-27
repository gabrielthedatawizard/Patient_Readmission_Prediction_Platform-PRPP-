/**
 * Backend Routes - Authentication
 * Handles login, token issuance, and session lifecycle events.
 */

const express = require('express');
const { body } = require('express-validator');
const { createAuditLog, getUserByEmail, toPublicUser } = require('../data');
const { compareSync } = require('../lib/passwordHash');
const logger = require('../utils/logger');
const {
  ACCESS_TOKEN_COOKIE_NAME,
  clearAccessTokenCookie,
  getAccessTokenCookieOptions,
  signAccessToken,
  requireAuth
} = require('../middleware/auth');
const {
  buildLoginThrottleKey,
  consumeLoginAttempt,
  clearLoginAttempts
} = require('../services/loginThrottle');
const { authRateLimit } = require('../middleware/rateLimit');
const { validateRequest } = require('../middleware/validateRequest');
const { asyncHandler } = require('../utils/asyncHandler');

const router = express.Router();

const loginValidation = [
  body('email')
    .trim()
    .isEmail()
    .withMessage('A valid email address is required.'),
  body('password')
    .isString()
    .trim()
    .isLength({ min: 1, max: 256 })
    .withMessage('Password is required.'),
  body('rememberMe')
    .optional()
    .isBoolean()
    .withMessage('rememberMe must be a boolean.')
];

function normalizeLoginEmail(rawEmail) {
  const email = String(rawEmail || '').trim().toLowerCase();

  // Accept common typo for national admin account used in demo environments.
  if (email === 'mho@trip.go.tz') {
    return 'moh@trip.go.tz';
  }

  return email;
}

function createAuthStoreUnavailableError(message) {
  const error = new Error(message || 'Authentication data store is not available.');
  error.code = 'AUTH_STORE_UNAVAILABLE';
  error.statusCode = 503;
  error.publicMessage = 'Authentication data store is not available.';
  return error;
}

async function resolveUserForLogin(email) {
  try {
    return await getUserByEmail(email);
  } catch (error) {
    if (error?.statusCode || error?.status || error?.publicMessage) {
      throw error;
    }

    throw createAuthStoreUnavailableError(
      `Unable to load authentication data for ${email}: ${error.message || 'Unknown error'}`
    );
  }
}

async function recordAuthAuditEvent(entry, requestId) {
  try {
    await createAuditLog(entry);
  } catch (error) {
    logger.warn(
      {
        requestId: requestId || null,
        action: entry?.action || 'auth_audit',
        userId: entry?.userId || null,
        error: error.message || String(error)
      },
      'Auth audit log write failed'
    );
  }
}

router.post('/login', authRateLimit, loginValidation, validateRequest, asyncHandler(async (req, res) => {
  const email = normalizeLoginEmail(req.body.email);
  const password = String(req.body.password || '');
  const rememberMe = Boolean(req.body.rememberMe);
  const throttleKey = buildLoginThrottleKey({
    email,
    ipAddress: req.ip
  });
  const throttleResult = consumeLoginAttempt(throttleKey);

  if (!throttleResult.allowed) {
    res.set('Retry-After', String(throttleResult.retryAfterSeconds || 60));
    return res.status(429).json({
      error: 'TooManyRequests',
      message: 'Too many failed login attempts. Please try again later.'
    });
  }

  if (!email || !password) {
    return res.status(400).json({
      error: 'ValidationError',
      message: 'Email and password are required.'
    });
  }

  const user = await resolveUserForLogin(email);

  if (!user || !compareSync(password, user.passwordHash || '')) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid credentials.'
    });
  }

  const publicUser = toPublicUser(user);
  const accessToken = signAccessToken(publicUser);
  clearLoginAttempts(throttleKey);
  res.cookie(
    ACCESS_TOKEN_COOKIE_NAME,
    accessToken,
    getAccessTokenCookieOptions({ rememberMe })
  );

  await recordAuthAuditEvent({
    userId: publicUser.id,
    userRole: publicUser.role,
    facilityId: publicUser.facilityId,
    regionCode: publicUser.regionCode,
    ipAddress: req.ip,
    action: 'login',
    resource: `user:${publicUser.id}`
  }, req.requestId);

  return res.json({
    accessToken,
    tokenType: 'Bearer',
    expiresIn: process.env.JWT_EXPIRES_IN || process.env.JWT_EXPIRY || '8h',
    sessionMode: rememberMe ? 'persistent' : 'session',
    user: publicUser
  });
}));

router.get('/me', requireAuth, (req, res) => {
  return res.json({ user: req.user });
});

router.post('/logout', requireAuth, asyncHandler(async (req, res) => {
  clearAccessTokenCookie(res);

  await recordAuthAuditEvent({
    userId: req.user.id,
    userRole: req.user.role,
    facilityId: req.user.facilityId,
    regionCode: req.user.regionCode,
    ipAddress: req.ip,
    action: 'logout',
    resource: `user:${req.user.id}`
  }, req.requestId);

  return res.json({
    message: 'Logout recorded.',
    sessionCleared: true
  });
}));

module.exports = router;
