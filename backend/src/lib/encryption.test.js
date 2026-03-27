function loadEncryptionModule() {
  const modulePath = require.resolve('./encryption');
  delete require.cache[modulePath];
  return require('./encryption');
}

describe('patient PII encryption helper', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
    jest.resetModules();
  });

  test('encrypts and decrypts patient values with an explicit key', () => {
    process.env.TRIP_DATA_PROVIDER = 'prisma';
    process.env.ENCRYPTION_KEY = '12345678901234567890123456789012';

    const { decryptValue, encryptValue, isEncryptedValue } = loadEncryptionModule();
    const encrypted = encryptValue('Amina Mwambungu');

    expect(isEncryptedValue(encrypted)).toBe(true);
    expect(encrypted).not.toBe('Amina Mwambungu');
    expect(decryptValue(encrypted)).toBe('Amina Mwambungu');
  });

  test('uses a development fallback key outside production', () => {
    process.env.NODE_ENV = 'test';
    process.env.TRIP_DATA_PROVIDER = 'prisma';
    delete process.env.ENCRYPTION_KEY;

    const { getEncryptionConfigStatus } = loadEncryptionModule();
    const status = getEncryptionConfigStatus();

    expect(status.status).toBe('up');
    expect(status.usingFallback).toBe(true);
  });

  test('fails fast in production-like persistent mode without a key', () => {
    process.env.NODE_ENV = 'production';
    process.env.TRIP_DATA_PROVIDER = 'prisma';
    delete process.env.ENCRYPTION_KEY;

    const { assertEncryptionConfig } = loadEncryptionModule();

    expect(() => assertEncryptionConfig()).toThrow(
      'ENCRYPTION_KEY must be set when using a persistent data provider in production.'
    );
  });

  test('adds patient encryption metadata when protecting write payloads', () => {
    process.env.TRIP_DATA_PROVIDER = 'prisma';
    process.env.ENCRYPTION_KEY = '12345678901234567890123456789012';

    const { protectPatientPiiWrite, unprotectPatientPiiRead } = loadEncryptionModule();
    const protectedRecord = protectPatientPiiWrite({
      id: 'PT-TEST-0001',
      name: 'Rehema Mussa',
      phone: '+255700000001',
      address: 'Chamwino, Dodoma',
      insurance: 'NHIF'
    });
    const unprotectedRecord = unprotectPatientPiiRead(protectedRecord);

    expect(protectedRecord.piiVersion).toBe(1);
    expect(protectedRecord.piiEncryptedAt).toBeInstanceOf(Date);
    expect(protectedRecord.name).not.toBe('Rehema Mussa');
    expect(unprotectedRecord.name).toBe('Rehema Mussa');
    expect(unprotectedRecord.phone).toBe('+255700000001');
    expect(unprotectedRecord.address).toBe('Chamwino, Dodoma');
    expect(unprotectedRecord.insurance).toBe('NHIF');
  });
});
