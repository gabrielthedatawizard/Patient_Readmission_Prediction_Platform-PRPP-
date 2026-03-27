const http = require('node:http');

let app;
let server;
let baseUrl = '';

jest.setTimeout(10000);

async function apiRequest(method, path, { token, body, headers } = {}) {
  const requestHeaders = {
    ...(body ? { 'Content-Type': 'application/json' } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(headers || {})
  };

  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: requestHeaders,
    body: body ? JSON.stringify(body) : undefined
  });

  const rawBody = await response.text();
  let parsedBody = {};
  if (rawBody) {
    try { parsedBody = JSON.parse(rawBody); } catch { parsedBody = { rawBody }; }
  }

  return { status: response.status, body: parsedBody, headers: response.headers };
}

describe('API Route Integration Tests', () => {
  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    app = require('../../server');
    server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    baseUrl = `http://127.0.0.1:${server.address().port}`;
  });

  afterAll(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  let token = '';
  let adminToken = '';
  let facilityManagerToken = '';

  test('Authentication - Login successful', async () => {
    const res = await apiRequest('POST', '/api/auth/login', {
      body: { email: 'clinician@trip.go.tz', password: 'Trip@2026' }
    });
    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeTruthy();
    token = res.body.accessToken;
  });

  test('Authentication - MOH login successful', async () => {
    const res = await apiRequest('POST', '/api/auth/login', {
      body: { email: 'moh@trip.go.tz', password: 'Trip@2026' }
    });
    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeTruthy();
    adminToken = res.body.accessToken;
  });

  test('Authentication - Facility manager login successful', async () => {
    const res = await apiRequest('POST', '/api/auth/login', {
      body: { email: 'facility_manager@trip.go.tz', password: 'Trip@2026' }
    });
    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeTruthy();
    facilityManagerToken = res.body.accessToken;
  });

  test('RBAC - Disallow unauthorized access to endpoints', async () => {
    const res = await apiRequest('GET', '/api/patients');
    expect(res.status).toBe(401);
  });

  test('Patients - Pagination returns expected structure', async () => {
    const res = await apiRequest('GET', '/api/patients?page=1&limit=2', { token });
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.patients)).toBe(true);
    expect(res.body.pagination).toBeDefined();
    expect(res.body.pagination.limit).toBe(2);
  });

  test('Tasks - Pagination returns expected structure', async () => {
    const res = await apiRequest('GET', '/api/tasks?page=1&limit=2', { token });
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.tasks)).toBe(true);
    expect(res.body.pagination).toBeDefined();
  });
  
  test('Alerts - Lists alerts correctly', async () => {
    const res = await apiRequest('GET', '/api/alerts?limit=5', { token });
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.alerts)).toBe(true);
  });

  test('Integrations - DHIS2 status requires national admin or ML engineer role', async () => {
    const res = await apiRequest('GET', '/api/integrations/dhis2/status', {
      token: facilityManagerToken
    });
    expect(res.status).toBe(403);
  });

  test('Integrations - DHIS2 status returns configuration snapshot for MOH', async () => {
    const res = await apiRequest('GET', '/api/integrations/dhis2/status', {
      token: adminToken
    });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('configured');
    expect(res.body).toHaveProperty('facilityLevels');
    expect(Array.isArray(res.body.facilityLevels)).toBe(true);
  });
});
