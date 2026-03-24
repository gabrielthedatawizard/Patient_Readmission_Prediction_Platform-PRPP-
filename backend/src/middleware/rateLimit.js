/**
 * Express middleware for rate-limiting auth-related routes.
 * Uses an in-memory sliding window per IP.
 */

const DEFAULT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const DEFAULT_MAX_REQUESTS = 20;

class RateLimiterStore {
  constructor() {
    this.hits = new Map();
    this.cleanupInterval = setInterval(() => this.cleanup(), 60_000);
    if (typeof this.cleanupInterval.unref === 'function') {
      this.cleanupInterval.unref();
    }
  }

  increment(key, windowMs) {
    const now = Date.now();
    const windowStart = now - windowMs;

    if (!this.hits.has(key)) {
      this.hits.set(key, []);
    }

    const timestamps = this.hits.get(key).filter((ts) => ts > windowStart);
    timestamps.push(now);
    this.hits.set(key, timestamps);

    return timestamps.length;
  }

  cleanup() {
    const cutoff = Date.now() - DEFAULT_WINDOW_MS * 2;

    for (const [key, timestamps] of this.hits.entries()) {
      const active = timestamps.filter((ts) => ts > cutoff);
      if (active.length === 0) {
        this.hits.delete(key);
      } else {
        this.hits.set(key, active);
      }
    }
  }

  destroy() {
    clearInterval(this.cleanupInterval);
    this.hits.clear();
  }
}

const store = new RateLimiterStore();

function rateLimit({
  windowMs = DEFAULT_WINDOW_MS,
  max = DEFAULT_MAX_REQUESTS,
  keyGenerator,
  message = 'Too many requests, please try again later.',
} = {}) {
  return (req, res, next) => {
    const key = keyGenerator
      ? keyGenerator(req)
      : `rl:${req.ip || req.socket?.remoteAddress || 'unknown'}`;

    const hits = store.increment(key, windowMs);
    const remaining = Math.max(0, max - hits);
    const retryAfterSeconds = Math.ceil(windowMs / 1000);

    res.setHeader('X-RateLimit-Limit', String(max));
    res.setHeader('X-RateLimit-Remaining', String(remaining));

    if (hits > max) {
      res.setHeader('Retry-After', String(retryAfterSeconds));
      return res.status(429).json({
        error: 'TooManyRequests',
        message,
        retryAfterSeconds,
      });
    }

    return next();
  };
}

const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  keyGenerator: (req) => `auth:${req.ip || 'unknown'}`,
  message: 'Too many authentication attempts. Please try again later.',
});

const predictionRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  keyGenerator: (req) => `predict:${req.ip || 'unknown'}:${req.user?.id || 'anon'}`,
  message: 'Too many prediction requests. Please slow down.',
});

module.exports = {
  rateLimit,
  authRateLimit,
  predictionRateLimit,
};
