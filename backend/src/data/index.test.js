describe('data provider env parsing', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
    jest.resetModules();
    jest.restoreAllMocks();
  });

  test('normalizes provider values with whitespace and casing', () => {
    process.env.TRIP_DATA_PROVIDER = ' PRISMA ';

    jest.isolateModules(() => {
      jest.doMock('./prismaStore', () => ({}));
      const data = require('./index');
      expect(data.REQUESTED_DATA_PROVIDER).toBe('prisma');
    });
  });

  test('parses strict provider flag with common truthy values', () => {
    process.env.TRIP_DATA_PROVIDER = 'memory';
    process.env.TRIP_STRICT_DATA_PROVIDER = ' YES ';

    const data = require('./index');

    expect(data.STRICT_DATA_PROVIDER).toBe(true);
  });

  test('defaults to strict mode in production for non-memory providers', () => {
    process.env.NODE_ENV = 'production';
    process.env.TRIP_DATA_PROVIDER = 'prisma';
    delete process.env.TRIP_STRICT_DATA_PROVIDER;

    jest.isolateModules(() => {
      jest.doMock('./prismaStore', () => ({}));
      const data = require('./index');
      expect(data.STRICT_DATA_PROVIDER).toBe(true);
    });
  });
});
