// Mock environment
process.env.FHIR_BASE_URL = 'http://localhost:8080/fhir'; // Stub URL
process.env.TRIP_DATA_PROVIDER = 'memory'; // Use memory store to avoid Prisma needs during quick unit test
process.env.DEFAULT_POLL_FACILITY_ID = 'FAC-MNH-001';

const { processFhirData } = require('../src/services/fhirPollingService');
const { listPatientsForUser } = require('../src/data');
const { mapFhirEncounterToTripVisit } = require('../src/integrations/fhirMediator');

const systemUser = { id: 'test-admin', role: 'moh' };

// Mock the network fetch used in fhirMediator to stub sample FHIR data
const originalFetch = global.fetch;
global.fetch = async (url) => {
  return {
    json: async () => {
      if (url.includes('Patient')) {
        return {
          entry: [{
             resource: {
                resourceType: 'Patient',
                id: 'FHIR-PT-1',
                name: [{ use: 'official', given: ['Jane'], family: 'Doe' }],
                gender: 'female',
                birthDate: '1980-01-01'
             }
          }]
        };
      }
      if (url.includes('Encounter')) {
         return {
            entry: [{
               resource: {
                  resourceType: 'Encounter',
                  id: 'FHIR-ENC-1',
                  subject: { reference: 'Patient/FHIR-PT-1' },
                  serviceProvider: { reference: 'Organization/FAC-MNH-001' },
                  period: { start: '2026-06-10T10:00:00Z', end: '2026-06-12T10:00:00Z' }
               }
            }]
         };
      }
      if (url.includes('Condition')) {
         return {
            entry: [{
               resource: {
                  resourceType: 'Condition',
                  subject: { reference: 'Patient/FHIR-PT-1' },
                  code: { coding: [{ system: 'icd10', code: 'A15.0', display: 'Tuberculosis' }] }
               }
            }]
         };
      }
      return { entry: [] };
    }
  };
};

// Important: mock the module loading system as well
const Module = require('module');
const originalRequire = Module.prototype.require;
Module.prototype.require = function() {
  if (arguments[0] === 'node-fetch') return global.fetch;
  return originalRequire.apply(this, arguments);
};

async function run() {
  console.log('--- STARTING MOCK FHIR POLL ---');
  await processFhirData();
  
  const patients = listPatientsForUser(systemUser);
  console.log('Total patients in store:', patients.length);
  const syncedPatient = patients.find(p => p.id === 'FHIR-PT-1');
  console.log('Synced Patient Details:', syncedPatient);
  
  // Restore fetch
  global.fetch = originalFetch;
  Module.prototype.require = originalRequire;
}

run().catch(console.error);
