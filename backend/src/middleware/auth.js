const jwt = require('jsonwebtoken');
const { getUserById, toPublicUser } = require('../data');

const DEFAULT_JWT_SECRET = 'trip-dev-secret-change-in-production';

function getJwtSecret() {
  return process.env.JWT_SECRET || DEFAULT_JWT_SECRET;
}

function getIsProduction() {
  return process.env.NODE_ENV === 'production';
}

function getAccessTokenCookieName() {
  return process.env.ACCESS_TOKEN_COOKIE_NAME || 'trip_access_token';
}

function getJwtExpiresIn() {
  return process.env.JWT_EXPIRES_IN || process.env.JWT_EXPIRY || '8h';
}

function assertAuthConfig() {
  const jwtSecret = getJwtSecret();

  if (
    getIsProduction() &&
    (!process.env.JWT_SECRET ||
      jwtSecret === DEFAULT_JWT_SECRET ||
      jwtSecret.trim().length < 32)
  ) {
    const error = new Error('JWT_SECRET must be set to a strong value in production.');
    error.code = 'AUTH_CONFIG_INVALID';
    error.statusCode = 503;
    error.publicMessage = 'Authentication service is not configured.';
    throw error;
  }
}

function getAuthConfigStatus() {
  try {
    assertAuthConfig();
    return {
      status: 'up',
      configured: !getIsProduction() || Boolean(process.env.JWT_SECRET)
    };
  } catch (error) {
    return {
      status: 'down',
      configured: false,
      message: error.message
    };
  }
}

function parseDurationToMs(rawValue) {
  if (typeof rawValue === 'number' && Number.isFinite(rawValue) && rawValue > 0) {
    return rawValue * 1000;
  }

  const normalized = String(rawValue || '8h').trim().toLowerCase();
  const match = normalized.match(/^(\d+)\s*([smhd])?$/);
  if (!match) {
    return 8 * 60 * 60 * 1000;
  }

  const value = Number(match[1]);
  const unit = match[2] || 's';
  const unitToMs = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000
  };

  return value * unitToMs[unit];
}

function getAccessTokenCookieBaseOptions() {
  const configuredSameSite = String(process.env.AUTH_COOKIE_SAME_SITE || 'lax')
    .trim()
    .toLowerCase();
  const sameSite = ['lax', 'strict', 'none'].includes(configuredSameSite)
    ? configuredSameSite
    : 'lax';
  const options = {
    httpOnly: true,
    sameSite,
    secure: getIsProduction() || sameSite === 'none',
    path: '/'
  };

  if (process.env.AUTH_COOKIE_DOMAIN) {
    options.domain = process.env.AUTH_COOKIE_DOMAIN;
  }

  return options;
}

function getAccessTokenCookieOptions({ rememberMe = true } = {}) {
  const options = {
    ...getAccessTokenCookieBaseOptions()
  };

  if (rememberMe) {
    options.maxAge = parseDurationToMs(getJwtExpiresIn());
  }

  return options;
}

function clearAccessTokenCookie(res) {
  res.clearCookie(getAccessTokenCookieName(), getAccessTokenCookieBaseOptions());
}

function parseCookies(cookieHeader) {
  const pairs = String(cookieHeader || '')
    .split(';')
    .map((entry) => entry.trim())
    .filter(Boolean);

  return pairs.reduce((accumulator, pair) => {
    const separatorIndex = pair.indexOf('=');
    if (separatorIndex === -1) {
      return accumulator;
    }

    const name = pair.slice(0, separatorIndex).trim();
    const value = pair.slice(separatorIndex + 1).trim();
    if (!name) {
      return accumulator;
    }

    try {
      accumulator[name] = decodeURIComponent(value);
    } catch (error) {
      accumulator[name] = value;
    }
    return accumulator;
  }, {});
}

function resolveAccessTokenFromHeaders(headers = {}) {
  const cookies = parseCookies(headers.cookie);
  const cookieToken = cookies[getAccessTokenCookieName()];
  if (cookieToken) {
    return cookieToken;
  }

  const authHeader = headers.authorization || headers.Authorization || '';
  if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }

  return null;
}

function verifyAccessToken(token) {
  assertAuthConfig();
  return jwt.verify(token, getJwtSecret(), {
    algorithms: ['HS256'],
    issuer: 'trip-backend'
  });
}

function signAccessToken(user) {
  assertAuthConfig();
  return jwt.sign(
    {
      sub: user.id,
      role: user.role,
      facilityId: user.facilityId,
      regionCode: user.regionCode,
      district: user.district || null,
      ward: user.ward || null
    },
    getJwtSecret(),
    {
      algorithm: 'HS256',
      expiresIn: getJwtExpiresIn(),
      issuer: 'trip-backend'
    }
  );
}

async function requireAuth(req, res, next) {
  const token = resolveAccessTokenFromHeaders(req.headers);

  if (!token) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Missing session credentials.'
    });
  }

  try {
    const payload = verifyAccessToken(token);
    const user = await getUserById(payload.sub);

    if (!user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'User not found for token subject.'
      });
    }

    if (user.roleExpiresAt) {
      const roleExpiry = new Date(user.roleExpiresAt).getTime();
      if (Number.isFinite(roleExpiry) && roleExpiry <= Date.now()) {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'Your role assignment has expired. Please contact an administrator.'
        });
      }
    }

    req.user = toPublicUser(user);
    req.auth = payload;

    return next();
  } catch (error) {
    if (error.code === 'AUTH_CONFIG_INVALID') {
      return next(error);
    }

    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid or expired token.'
    });
  }
}

module.exports = {
  ACCESS_TOKEN_COOKIE_NAME: getAccessTokenCookieName(),
  clearAccessTokenCookie,
  getAccessTokenCookieOptions,
  getAuthConfigStatus,
  parseCookies,
  resolveAccessTokenFromHeaders,
  signAccessToken,
  verifyAccessToken,
  requireAuth
};
