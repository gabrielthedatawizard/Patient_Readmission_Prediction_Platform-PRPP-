const jwt = require('jsonwebtoken');
const { getUserById, toPublicUser } = require('../data');

const JWT_SECRET = process.env.JWT_SECRET || 'trip-dev-secret-change-in-production';

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
      expiresIn: process.env.JWT_EXPIRES_IN || '8h',
      issuer: 'trip-backend'
    }
  );
}

async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Missing Bearer token.'
    });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET, { issuer: 'trip-backend' });
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
  signAccessToken,
  requireAuth
};
