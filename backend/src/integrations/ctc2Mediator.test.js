const {
  isConfigured,
  mapCtcToTripProfile,
  fetchPatientCtcRecords
} = require('./ctc2Mediator');

describe('CTC2 Mediator', () => {
  const mockValidCtcRecord = {
    cd4Count: '450',
    viralLoad: '500',
    artStartDate: '2020-05-10T00:00:00.000Z',
    lastVisitDate: '2026-06-10T10:00:00.000Z',
    artRegimen: 'TLD (Tenofovir/Lamivudine/Dolutegravir)',
    artStatus: 'active',
    hivPositive: true
  };

  test('mapCtcToTripProfile maps correctly based on active status', () => {
    const profile = mapCtcToTripProfile(mockValidCtcRecord);
    expect(profile).toBeDefined();
    expect(profile.hasHiv).toBe(true);
    expect(profile.onArt).toBe(true);
    expect(profile.cd4Count).toBe(450);
    expect(profile.viralLoad).toBe(500);
    expect(profile.viralLoadSuppressed).toBe(true);
    expect(profile.artRegimen).toContain('TLD');
    expect(profile.ctcDataSource).toBe('ctc2');
    expect(profile.ctcSyncedAt).toBeDefined();
  });

  test('mapCtcToTripProfile handles missing/null values safely', () => {
    const profile = mapCtcToTripProfile({
      artStatus: 'stopped',
      hiv_positive: true
    });
    expect(profile.onArt).toBe(false);
    expect(profile.hasHiv).toBe(true);
    expect(profile.cd4Count).toBeNull();
  });

  test('fetchPatientCtcRecords skips when not configured', async () => {
    // Relying on lack of CTC2_BASE_URL
    const originalUrl = process.env.CTC2_BASE_URL;
    process.env.CTC2_BASE_URL = '';
    
    expect(isConfigured()).toBe(false);
    const result = await fetchPatientCtcRecords('12345');
    expect(result).toBeNull();
    
    process.env.CTC2_BASE_URL = originalUrl;
  });
});
