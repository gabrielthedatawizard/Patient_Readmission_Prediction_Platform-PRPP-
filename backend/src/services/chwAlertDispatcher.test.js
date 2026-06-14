const { dispatchChwAlert, getChwForPatient } = require('./chwAlertDispatcher');

// Mock data module
jest.mock('../data', () => ({
  createAuditLog: jest.fn(),
  users: [
    { role: 'chw', facilityId: 'test-facility', phone: '+255700999999', id: 'usr-chw-1' },
    { role: 'clinician', facilityId: 'test-facility', phone: '+255700888888', id: 'usr-clin-1' }
  ],
  patients: [
    { id: 'pat-1', facilityId: 'test-facility', name: 'Test Patient' }
  ]
}));

// Mock prisma
jest.mock('../lib/prisma', () => ({
  prisma: null
}));

// Mock smsGateway
jest.mock('./smsGateway', () => ({
  sendSmsMessage: jest.fn().mockResolvedValue({
    target: '+255700999999',
    provider: 'beem',
    status: 'submitted'
  })
}));

describe('CHW Alert Dispatcher', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('getChwForPatient returns CHW for given facility using memory fallback', async () => {
    const chw = await getChwForPatient('pat-1', 'test-facility');
    expect(chw).toBeDefined();
    expect(chw.role).toBe('chw');
    expect(chw.phone).toBe('+255700999999');
  });

  test('dispatchChwAlert logs skip if SMS is disabled', async () => {
    const originalEnv = process.env.ALERT_SMS_ENABLED;
    process.env.ALERT_SMS_ENABLED = 'false';

    const result = await dispatchChwAlert({}, {
      patient: { id: 'pat-1' },
      prediction: { score: 85 },
      facilityId: 'test-facility'
    });

    expect(result.status).toBe('skipped');
    expect(result.provider).toBe('disabled');
    process.env.ALERT_SMS_ENABLED = originalEnv;
  });

  test('dispatchChwAlert calls sendSmsMessage with CHW phone', async () => {
    const originalEnv = process.env.ALERT_SMS_ENABLED;
    process.env.ALERT_SMS_ENABLED = 'true';

    const smsGateway = require('./smsGateway');

    const result = await dispatchChwAlert({ user: { id: 'admin' }, ip: '127.0.0.1' }, {
      patient: { id: 'pat-1', name: 'Test Patient' },
      prediction: { score: 92 },
      facilityId: 'test-facility',
      alertId: 'al-123'
    });

    expect(result.status).toBe('submitted');
    expect(result.target).toBe('+255700999999');
    expect(smsGateway.sendSmsMessage).toHaveBeenCalled();
    expect(smsGateway.sendSmsMessage.mock.calls[0][0].to).toBe('+255700999999');

    process.env.ALERT_SMS_ENABLED = originalEnv;
  });
});
