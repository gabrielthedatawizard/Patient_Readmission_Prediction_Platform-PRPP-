describe('prismaStore module exports', () => {
  afterEach(() => {
    jest.resetModules();
  });

  test('loads module and exposes visit helpers without undefined exports', () => {
    expect(() => require('./prismaStore')).not.toThrow();
    const store = require('./prismaStore');

    expect(typeof store.listVisitsForPatient).toBe('function');
    expect(store).not.toHaveProperty('listVisitsForUser');
  });
});
