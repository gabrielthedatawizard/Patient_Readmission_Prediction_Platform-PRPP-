/**
 * Backend Routes - Authentication
 * Handles login, token issuance, and session lifecycle events.
 */

const express = require('express');
const bcrypt = require('bcrypt');
const { createAuditLog, getUserByEmail, toPublicUser } = require('../data');
const { signAccessToken, requireAuth } = require('../middleware/auth');
const {
  buildLoginThrottleKey,
  consumeLoginAttempt,
  clearLoginAttempts
} = require('../services/loginThrottle');
const { asyncHandler } = require('../utils/asyncHandler');

const router = express.Router();

function normalizeLoginEmail(rawEmail) {
  const email = String(rawEmail || '').trim().toLowerCase();

  // Accept common typo for national admin account used in demo environments.
  if (email === 'mho@trip.go.tz') {
    return 'moh@trip.go.tz';
  }

  return email;
}

router.post('/login', asyncHandler(async (req, res) => {
  const email = normalizeLoginEmail(req.body.email);
  const password = String(req.body.password || '');
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

  const user = await getUserByEmail(email);

  if (!user || !bcrypt.compareSync(password, user.passwordHash || '')) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid credentials.'
    });
  }

  const publicUser = toPublicUser(user);
  const accessToken = signAccessToken(publicUser);
  clearLoginAttempts(throttleKey);

  await createAuditLog({
    userId: publicUser.id,
    userRole: publicUser.role,
    facilityId: publicUser.facilityId,
    regionCode: publicUser.regionCode,
    ipAddress: req.ip,
    action: 'login',
    resource: `user:${publicUser.id}`
  });

  return res.json({
    accessToken,
    tokenType: 'Bearer',
    expiresIn: process.env.JWT_EXPIRES_IN || '8h',
    user: publicUser
  });
}));

router.get('/me', requireAuth, (req, res) => {
  return res.json({ user: req.user });
});

router.post('/logout', requireAuth, asyncHandler(async (req, res) => {
  await createAuditLog({
    userId: req.user.id,
    userRole: req.user.role,
    facilityId: req.user.facilityId,
    regionCode: req.user.regionCode,
    ipAddress: req.ip,
    action: 'logout',
    resource: `user:${req.user.id}`
  });

  return res.json({
    message: 'Logout recorded. Discard token client-side.'
  });
}));

module.exports = router;
