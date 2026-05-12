/**
 * @jest-environment node
 */

describe('emailGateway', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
    jest.resetModules();
  });

  test('reports disabled when ALERT_EMAIL_ENABLED is not true', () => {
    delete process.env.ALERT_EMAIL_ENABLED;
    const { getEmailGatewayStatus } = require('./emailGateway');
    const status = getEmailGatewayStatus();
    expect(status.enabled).toBe(false);
    expect(status.status).toBe('disabled');
  });

  test('reports degraded when enabled but no recipients', () => {
    process.env.ALERT_EMAIL_ENABLED = 'true';
    process.env.ALERT_EMAIL_PROVIDER = 'smtp';
    process.env.SMTP_HOST = 'smtp.example.com';
    process.env.ALERT_EMAIL_FROM = 'trip@example.com';
    delete process.env.ALERT_EMAIL_RECIPIENT;
    delete process.env.ALERT_EMAIL_RECIPIENTS;
    const { getEmailGatewayStatus } = require('./emailGateway');
    const status = getEmailGatewayStatus();
    expect(status.status).toBe('degraded');
    expect(status.recipientCount).toBe(0);
  });

  test('reports up when SMTP and recipients are configured', () => {
    process.env.ALERT_EMAIL_ENABLED = 'true';
    process.env.ALERT_EMAIL_PROVIDER = 'smtp';
    process.env.SMTP_HOST = 'smtp.example.com';
    process.env.ALERT_EMAIL_FROM = 'trip@example.com';
    process.env.ALERT_EMAIL_RECIPIENT = 'ops@example.com';
    const { getEmailGatewayStatus } = require('./emailGateway');
    const status = getEmailGatewayStatus();
    expect(status.status).toBe('up');
    expect(status.recipientCount).toBe(1);
  });
});
