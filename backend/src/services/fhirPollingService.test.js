const { processFhirData, getPollingStatus, triggerImmediatePoll } = require('./fhirPollingService');

// Mock FHIR mediator
jest.mock('../integrations/fhirMediator', () => ({
  pollNewEncounters: jest.fn().mockResolvedValue({
    patients: [
      { fhirId: 'fhir-pt-1', name: 'FHIR Patient 1', phone: '+255123123123' }
    ],
    encounters: [
      { fhirEncounterId: 'enc-1', fhirPatientId: 'fhir-pt-1', lengthOfStay: 5 }
    ],
    rawCounts: { patients: 1, encounters: 1 }
  })
}));

// Mock enrichment mediators
jest.mock('../integrations/ctc2Mediator', () => ({
  fetchPatientCtcRecords: jest.fn().mockResolvedValue({ hasHiv: true, onArt: true })
}));
jest.mock('../integrations/elmisMediator', () => ({
  fetchDispensedMedications: jest.fn().mockResolvedValue({ medications: ['Furosemide'] })
}));
jest.mock('../integrations/clientRegistryMediator', () => ({
  resolvePatientIdentity: jest.fn().mockReturnValue(null) // New patient
}));

// Mock Data service
const mockData = require('../data');
jest.mock('../data', () => ({
  getPatientForUser: jest.fn().mockResolvedValue(null),
  createPatientForUser: jest.fn().mockResolvedValue({ id: 'fhir-pt-1' }),
  updatePatientForUser: jest.fn().mockResolvedValue({ id: 'fhir-pt-1' }),
  getVisitForUser: jest.fn().mockResolvedValue(null),
  createVisitForUser: jest.fn().mockResolvedValue({ id: 'enc-1' })
}));

describe('FHIR Polling Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('getPollingStatus returns correct state', () => {
    const status = getPollingStatus();
    expect(status).toBeDefined();
    expect(status).toHaveProperty('configured');
    expect(status).toHaveProperty('isRunning');
    expect(status).toHaveProperty('lastPollTime');
  });

  test('triggerImmediatePoll processes FHIR data and applies enrichment', async () => {
    const originalEnv = process.env.FHIR_BASE_URL;
    process.env.FHIR_BASE_URL = 'http://test-fhir';

    const result = await triggerImmediatePoll();

    expect(result.status).toBe('success');
    expect(result.patients).toBe(1);
    expect(result.encounters).toBe(1);

    const fhirMediator = require('../integrations/fhirMediator');
    expect(fhirMediator.pollNewEncounters).toHaveBeenCalled();

    const dataDeps = require('../data');
    expect(dataDeps.createPatientForUser).toHaveBeenCalledTimes(1);
    expect(dataDeps.updatePatientForUser).toHaveBeenCalled(); // Should be called after enrichment
    expect(dataDeps.createVisitForUser).toHaveBeenCalledTimes(1);

    const elmisMed = require('../integrations/elmisMediator');
    expect(elmisMed.fetchDispensedMedications).toHaveBeenCalled();

    process.env.FHIR_BASE_URL = originalEnv;
  });

  test('processFhirData skips when FHIR_BASE_URL is missing', async () => {
    const originalEnv = process.env.FHIR_BASE_URL;
    process.env.FHIR_BASE_URL = '';

    await processFhirData();
    const fhirMediator = require('../integrations/fhirMediator');
    expect(fhirMediator.pollNewEncounters).not.toHaveBeenCalled();

    process.env.FHIR_BASE_URL = originalEnv;
  });
});
