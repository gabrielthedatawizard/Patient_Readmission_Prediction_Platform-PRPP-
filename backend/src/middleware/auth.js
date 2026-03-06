const jwt = require('jsonwebtoken');
const { getUserById, toPublicUser } = require('../data');

const DEFAULT_JWT_SECRET = 'trip-dev-secret-change-in-production';
const JWT_SECRET = process.env.JWT_SECRET || DEFAULT_JWT_SECRET;
const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const ACCESS_TOKEN_COOKIE_NAME =
  process.env.ACCESS_TOKEN_COOKIE_NAME || 'trip_access_token';

if (
  IS_PRODUCTION &&
  (!process.env.JWT_SECRET ||
    JWT_SECRET === DEFAULT_JWT_SECRET ||
    JWT_SECRET.trim().length < 32)
) {
  throw new Error('JWT_SECRET must be set to a strong value in production.');
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
    secure: IS_PRODUCTION || sameSite === 'none',
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
    options.maxAge = parseDurationToMs(process.env.JWT_EXPIRES_IN || '8h');
  }

  return options;
}

function clearAccessTokenCookie(res) {
  res.clearCookie(ACCESS_TOKEN_COOKIE_NAME, getAccessTokenCookieBaseOptions());
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
  const authHeader = headers.authorization || headers.Authorization || '';
  if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }

  const cookies = parseCookies(headers.cookie);
  return cookies[ACCESS_TOKEN_COOKIE_NAME] || null;
}

function verifyAccessToken(token) {
  return jwt.verify(token, JWT_SECRET, {
    algorithms: ['HS256'],
    issuer: 'trip-backend'
  });
}

function signAccessToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      role: user.role,
      facilityId: user.facilityId,
      regionCode: user.regionCode
    },
    JWT_SECRET,
    {
      algorithm: 'HS256',
      expiresIn: process.env.JWT_EXPIRES_IN || '8h',
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

    req.user = toPublicUser(user);
    req.auth = payload;

    return next();
  } catch (error) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid or expired token.'
    });
  }
}

module.exports = {
  ACCESS_TOKEN_COOKIE_NAME,
  clearAccessTokenCookie,
  getAccessTokenCookieOptions,
  parseCookies,
  resolveAccessTokenFromHeaders,
  signAccessToken,
  verifyAccessToken,
  requireAuth
};
