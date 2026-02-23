const cache = new Map();
const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000;

function now() {
  return Date.now();
}

function cleanupExpired() {
  const timestamp = now();

  for (const [key, value] of cache.entries()) {
    if (value.expiresAt <= timestamp) {
      cache.delete(key);
    }
  }
}

function makeScope({ userId, route, key }) {
  return `${userId || 'anonymous'}:${route}:${key}`;
}

function getReplay(scope) {
  cleanupExpired();
  const value = cache.get(scope);

  if (!value) {
    return null;
  }

  if (value.expiresAt <= now()) {
    cache.delete(scope);
    return null;
  }

  return {
    statusCode: value.statusCode,
    body: value.body,
    storedAt: value.storedAt,
    expiresAt: value.expiresAt
  };
}

function setReplay(scope, { statusCode, body }, ttlMs = DEFAULT_TTL_MS) {
  const timestamp = now();

  cache.set(scope, {
    statusCode,
    body,
    storedAt: timestamp,
    expiresAt: timestamp + ttlMs
  });
}

module.exports = {
  makeScope,
  getReplay,
  setReplay
};
