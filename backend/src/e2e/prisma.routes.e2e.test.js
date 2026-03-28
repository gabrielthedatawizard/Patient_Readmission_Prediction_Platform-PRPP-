const http = require('node:http');

const SHOULD_RUN = process.env.RUN_PRISMA_E2E === 'true';
const describeIf = SHOULD_RUN ? describe : describe.skip;

if (SHOULD_RUN) {
  process.env.TRIP_DATA_PROVIDER = 'prisma';
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'trip-prisma-e2e-secret';
}

let app;
let server;
let baseUrl = '';

jest.setTimeout(30000);

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
    try {
      parsedBody = JSON.parse(rawBody);
    } catch {
      parsedBody = { rawBody };
    }
  }

  return {
    status: response.status,
    body: parsedBody,
    headers: response.headers
  };
}

async function login(email, password = 'Trip@2026') {
  const response = await apiRequest('POST', '/api/auth/login', {
    body: {
      email,
      password
    }
  });

  expect(response.status).toBe(200);
  expect(response.body.accessToken).toBeTruthy();
  expect(response.headers.get('set-cookie')).toContain('trip_access_token=');
  expect(response.headers.get('set-cookie')).toContain('HttpOnly');

  return response.body.accessToken;
}

describeIf('Prisma route e2e', () => {
  beforeAll(async () => {
    if (!process.env.DATABASE_URL) {
      throw new Error(
        'DATABASE_URL is required for Prisma e2e tests. ' +
          'Run `npm run phase2:verify` after configuring backend/.env.'
      );
    }

    app = require('../../server');
    server = http.createServer(app);

    await new Promise((resolve) => {
      server.listen(0, '127.0.0.1', resolve);
    });

    const address = server.address();
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterAll(async () => {
    if (!server) {
      return;
    }

    await new Promise((resolve) => {
      server.close(resolve);
    });
  });

  test('auth login and profile endpoint work in prisma mode', async () => {
    const clinicianToken = await login('clinician@trip.go.tz');

    const me = await apiRequest('GET', '/api/auth/me', {
      token: clinicianToken
    });

    expect(me.status).toBe(200);
    expect(me.body.user).toBeTruthy();
    expect(me.body.user.email).toBe('clinician@trip.go.tz');
    expect(me.body.user.role).toBe('clinician');
  });

  test('row-level patient access is enforced', async () => {
    const clinicianToken = await login('clinician@trip.go.tz');

    const listResponse = await apiRequest('GET', '/api/patients', {
      token: clinicianToken
    });

    expect(listResponse.status).toBe(200);
    expect(Array.isArray(listResponse.body.patients)).toBe(true);
    expect(listResponse.body.patients.length).toBeGreaterThan(0);
    listResponse.body.patients.forEach((patient) => {
      expect(patient.facilityId).toBe('FAC-ARH-001');
    });

    const inaccessiblePatient = await apiRequest('GET', '/api/patients/PT-2026-0001', {
      token: clinicianToken
    });

    expect(inaccessiblePatient.status).toBe(404);
  });

  test('prediction endpoint writes prisma records and returns intervention tasks', async () => {
    const clinicianToken = await login('clinician@trip.go.tz');

    const predictionResponse = await apiRequest('POST', '/api/predictions/predict', {
      token: clinicianToken,
      body: {
        patientId: 'PT-2026-0002',
        features: {
          age: 89,
          priorAdmissions12m: 6,
          lengthOfStayDays: 14,
          charlsonIndex: 8,
          egfr: 30,
          hemoglobin: 8.2,
          hba1c: 10.4,
          bpSystolic: 170,
          bpDiastolic: 104,
          phoneAccess: false,
          transportationDifficulty: true,
          livesAlone: true,
          highRiskMedicationCount: 4,
          icuStayDays: 4
        }
      }
    });

    expect(predictionResponse.status).toBe(201);
    expect(predictionResponse.body.prediction).toBeTruthy();
    expect(predictionResponse.body.prediction.patientId).toBe('PT-2026-0002');
    expect(predictionResponse.body.prediction.tier).toBe('High');
    expect(Array.isArray(predictionResponse.body.tasks)).toBe(true);
    expect(predictionResponse.body.tasks.length).toBeGreaterThan(0);

    const resultsResponse = await apiRequest('GET', '/api/predictions/results/PT-2026-0002', {
      token: clinicianToken
    });

    expect(resultsResponse.status).toBe(200);
    expect(resultsResponse.body.predictions.some((item) => item.id === predictionResponse.body.prediction.id)).toBe(true);
  });

  test('workflow verification endpoint summarizes high-risk prediction automation', async () => {
    const clinicianToken = await login('clinician@trip.go.tz');

    const predictionResponse = await apiRequest('POST', '/api/predictions/predict', {
      token: clinicianToken,
      body: {
        patientId: 'PT-2026-0002',
        features: {
          age: 91,
          priorAdmissions12m: 7,
          lengthOfStayDays: 16,
          charlsonIndex: 9,
          egfr: 28,
          hemoglobin: 7.9,
          hba1c: 10.8,
          bpSystolic: 176,
          bpDiastolic: 108,
          phoneAccess: false,
          transportationDifficulty: true,
          livesAlone: true,
          highRiskMedicationCount: 5,
          icuStayDays: 5
        }
      }
    });

    expect(predictionResponse.status).toBe(201);

    const workflowResponse = await apiRequest(
      'GET',
      `/api/predictions/${predictionResponse.body.prediction.id}/workflow`,
      {
        token: clinicianToken
      }
    );

    expect(workflowResponse.status).toBe(200);
    expect(workflowResponse.body.workflow).toBeTruthy();
    expect(workflowResponse.body.workflow.prediction.id).toBe(predictionResponse.body.prediction.id);
    expect(workflowResponse.body.workflow.tasks.length).toBeGreaterThan(0);
    expect(workflowResponse.body.workflow.auditTrail.some((entry) => entry.action === 'prediction_generated')).toBe(true);
    expect(
      ['high_risk_active', 'interventions_in_progress', 'resolved']
        .includes(workflowResponse.body.workflow.verification.workflowState)
    ).toBe(true);
  });

  test('analytics and audit routes are accessible for MOH role', async () => {
    const mohToken = await login('moh@trip.go.tz');

    const quality = await apiRequest('GET', '/api/analytics/quality', {
      token: mohToken
    });
    const fairness = await apiRequest('GET', '/api/analytics/fairness', {
      token: mohToken
    });
    const audit = await apiRequest('GET', '/api/audit?limit=5', {
      token: mohToken
    });

    expect(quality.status).toBe(200);
    expect(quality.body.quality).toBeTruthy();
    expect(fairness.status).toBe(200);
    expect(fairness.body.fairness).toBeTruthy();
    expect(audit.status).toBe(200);
    expect(Array.isArray(audit.body.logs)).toBe(true);
  });

  test('sync push endpoint enforces idempotent replay', async () => {
    const clinicianToken = await login('clinician@trip.go.tz');
    const idempotencyKey = `prisma-e2e-${Date.now()}`;
    const patientId = `PT-E2E-${Date.now()}`;
    const now = new Date().toISOString();

    const pushPayload = {
      operations: [
        {
          operationId: 'op-1',
          type: 'patient_upsert',
          data: {
            id: patientId,
            name: 'Prisma E2E Patient',
            age: 52,
            gender: 'female',
            phone: '+255700999999',
            status: 'admitted',
            facilityId: 'FAC-ARH-001',
            clientUpdatedAt: now
          }
        }
      ]
    };

    const firstPush = await apiRequest('POST', '/api/sync/push', {
      token: clinicianToken,
      body: pushPayload,
      headers: {
        'Idempotency-Key': idempotencyKey
      }
    });

    expect(firstPush.status).toBe(200);
    expect(firstPush.body.replayed).toBe(false);
    expect(firstPush.body.summary.applied).toBe(1);
    expect(firstPush.body.summary.rejected).toBe(0);

    const secondPush = await apiRequest('POST', '/api/sync/push', {
      token: clinicianToken,
      body: pushPayload,
      headers: {
        'Idempotency-Key': idempotencyKey
      }
    });

    expect(secondPush.status).toBe(200);
    expect(secondPush.body.replayed).toBe(true);
    expect(secondPush.body.summary).toEqual(firstPush.body.summary);
  });
});
