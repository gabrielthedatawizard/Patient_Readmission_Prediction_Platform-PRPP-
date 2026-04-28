const http = require('node:http');

jest.setTimeout(10000);

const ORIGINAL_ENV = { ...process.env };

async function startServer() {
  jest.resetModules();
  const app = require('../../server');
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  return {
    baseUrl,
    async close() {
      await new Promise((resolve) => server.close(resolve));
    }
  };
}

async function apiRequest(baseUrl, method, path, { body, token } = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });

  const rawBody = await response.text();
  const parsedBody = rawBody ? JSON.parse(rawBody) : {};

  return {
    status: response.status,
    body: parsedBody,
    headers: response.headers
  };
}

describe('Demo auth behavior in production memory mode', () => {
  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  test('login still succeeds when memory demo mode is deployed without JWT_SECRET', async () => {
    process.env = {
      ...ORIGINAL_ENV,
      NODE_ENV: 'production',
      TRIP_DATA_PROVIDER: 'memory'
    };
    delete process.env.JWT_SECRET;
    delete process.env.ALLOW_DEMO_AUTH_IN_PRODUCTION;

    const server = await startServer();

    try {
      const loginResponse = await apiRequest(server.baseUrl, 'POST', '/api/auth/login', {
        body: {
          email: 'ml_engineer@trip.go.tz',
          password: 'Trip@2026',
          rememberMe: true
        }
      });

      expect(loginResponse.status).toBe(200);
      expect(loginResponse.body.accessToken).toBeTruthy();
      expect(loginResponse.body.user.email).toBe('ml_engineer@trip.go.tz');

      const meResponse = await apiRequest(server.baseUrl, 'GET', '/api/auth/me', {
        token: loginResponse.body.accessToken
      });

      expect(meResponse.status).toBe(200);
      expect(meResponse.body.user.email).toBe('ml_engineer@trip.go.tz');
    } finally {
      await server.close();
    }
  });

  test('login still fails closed when demo auth fallback is disabled', async () => {
    process.env = {
      ...ORIGINAL_ENV,
      NODE_ENV: 'production',
      TRIP_DATA_PROVIDER: 'memory',
      ALLOW_DEMO_AUTH_IN_PRODUCTION: 'false'
    };
    delete process.env.JWT_SECRET;

    const server = await startServer();

    try {
      const loginResponse = await apiRequest(server.baseUrl, 'POST', '/api/auth/login', {
        body: {
          email: 'ml_engineer@trip.go.tz',
          password: 'Trip@2026',
          rememberMe: true
        }
      });

      expect(loginResponse.status).toBe(503);
      expect(loginResponse.body.error).toBe('AUTH_CONFIG_INVALID');
    } finally {
      await server.close();
    }
  });
});
