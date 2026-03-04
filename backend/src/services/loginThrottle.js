const attempts = new Map();

const DEFAULT_WINDOW_MS = Number(process.env.LOGIN_RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000;
const DEFAULT_MAX_ATTEMPTS = Number(process.env.LOGIN_RATE_LIMIT_MAX_ATTEMPTS) || 10;
const DEFAULT_BLOCK_MS = Number(process.env.LOGIN_RATE_LIMIT_BLOCK_MS) || 15 * 60 * 1000;
const CLEANUP_INTERVAL_MS = Number(process.env.LOGIN_RATE_LIMIT_CLEANUP_MS) || 10 * 60 * 1000;

function sanitizeValue(value) {
  return String(value || '').trim().toLowerCase();
}

function buildLoginThrottleKey({ email, ipAddress }) {
  const normalizedEmail = sanitizeValue(email) || 'unknown';
  const normalizedIp = sanitizeValue(ipAddress) || 'unknown';
  return `${normalizedEmail}::${normalizedIp}`;
}

function consumeLoginAttempt(key) {
  const now = Date.now();
  const state = attempts.get(key);

  if (!state) {
    attempts.set(key, {
      firstAttemptAt: now,
      lastAttemptAt: now,
      blockedUntil: 0,
      count: 1
    });

    return {
      allowed: true,
      remainingAttempts: Math.max(DEFAULT_MAX_ATTEMPTS - 1, 0)
    };
  }

  if (state.blockedUntil > now) {
    return {
      allowed: false,
      retryAfterSeconds: Math.ceil((state.blockedUntil - now) / 1000)
    };
  }

  if (now - state.firstAttemptAt > DEFAULT_WINDOW_MS) {
    state.firstAttemptAt = now;
    state.count = 0;
    state.blockedUntil = 0;
  }

  state.count += 1;
  state.lastAttemptAt = now;

  if (state.count > DEFAULT_MAX_ATTEMPTS) {
    state.blockedUntil = now + DEFAULT_BLOCK_MS;

    return {
      allowed: false,
      retryAfterSeconds: Math.ceil(DEFAULT_BLOCK_MS / 1000)
    };
  }

  return {
    allowed: true,
    remainingAttempts: Math.max(DEFAULT_MAX_ATTEMPTS - state.count, 0)
  };
}

function clearLoginAttempts(key) {
  attempts.delete(key);
}

function cleanupExpiredEntries() {
  const now = Date.now();

  for (const [key, state] of attempts.entries()) {
    const staleByWindow = now - state.lastAttemptAt > DEFAULT_WINDOW_MS;
    const staleByBlock = state.blockedUntil && state.blockedUntil < now - DEFAULT_WINDOW_MS;

    if (staleByWindow || staleByBlock) {
      attempts.delete(key);
    }
  }
}

const cleanupTimer = setInterval(cleanupExpiredEntries, CLEANUP_INTERVAL_MS);
if (typeof cleanupTimer.unref === 'function') {
  cleanupTimer.unref();
}

module.exports = {
  buildLoginThrottleKey,
  consumeLoginAttempt,
  clearLoginAttempts
};

