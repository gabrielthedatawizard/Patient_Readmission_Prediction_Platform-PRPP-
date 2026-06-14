const { pollNewEncounters } = require('../integrations/fhirMediator');
const { resolvePatientIdentity } = require('../integrations/clientRegistryMediator');
const { getPatientForUser, createPatientForUser, updatePatientForUser, getVisitForUser, createVisitForUser } = require('../data');
const logger = require('../utils/logger');

const POLLING_INTERVAL_MS = 1000 * 60 * 5; // 5 minutes default
const FHIR_BASE_URL = process.env.FHIR_BASE_URL;

let pollingTimeout = null;
let lastPollTime = new Date(Date.now() - 24 * 60 * 60 * 1000); // Start 24h ago

const systemUser = {
  id: 'system-fhir-poller',
  role: 'moh', // Grants national-level access, allowing insertion to any facility
  facilityId: null,
  regionCode: null,
  district: null
};

async function processFhirData() {
  if (!FHIR_BASE_URL) {
    logger.debug('FHIR Polling skipped: FHIR_BASE_URL not configured.');
    return;
  }

  logger.info(`Polling FHIR server for new encounters since ${lastPollTime.toISOString()}`);
  
  try {
    const { patients, encounters, rawCounts } = await pollNewEncounters(FHIR_BASE_URL, lastPollTime);
    
    logger.info(`FHIR Poll Success: Found ${patients.length} mapped patients, ${encounters.length} mapped encounters.`);

    for (const p of patients) {
      try {
        let existing = await getPatientForUser(systemUser, p.fhirId);

        // --- PHASE 2: Client Registry Identity Resolution ---
        // If we don't know the patient by FHIR ID, try mapping them using NIDA/Phone
        if (!existing) {
          const resolvedId = resolvePatientIdentity(systemUser, p);
          if (resolvedId) {
             existing = await getPatientForUser(systemUser, resolvedId);
             // Align pointers so future syncs track to the unified ID
             p.fhirId = resolvedId;
          }
        }

        if (existing) {
          await updatePatientForUser(systemUser, p.fhirId, {
            ...p,
            phone: p.phone || existing.phone,
            address: p.address || existing.address
          });
        } else {
          // Note: If EMR does not provide facilityId for patient, we might need to derive it from their first encounter
          await createPatientForUser(systemUser, {
            id: p.fhirId,
            ...p,
            facilityId: p.facilityId || process.env.DEFAULT_POLL_FACILITY_ID || 'FAC-DEFAULT',
            status: 'active'
          });
        }
      } catch (err) {
        logger.error(`Error syncing FHIR Patient ${p.fhirId}:`, err);
      }
    }

    for (const e of encounters) {
      try {
        if (e.clinicalProfile) {
           await updatePatientForUser(systemUser, e.fhirPatientId, {
              clinicalProfile: e.clinicalProfile
           });
        }
        
        await createVisitForUser(systemUser, e.fhirPatientId, {
          id: e.fhirEncounterId,
          ...e
        });
      } catch (err) {
        logger.error(`Error syncing FHIR Encounter ${e.fhirEncounterId}:`, err);
      }
    }

    // Update cursor
    lastPollTime = new Date();

  } catch (error) {
    logger.error('FHIR Polling failed:', error);
  }
}

function startPolling(initialDelayMs = 5000) {
  if (pollingTimeout) return;
  
  logger.info('FHIR Polling Service Initializing...');
  
  pollingTimeout = setTimeout(async () => {
    await processFhirData();
    // Schedule next
    pollingTimeout = setInterval(processFhirData, POLLING_INTERVAL_MS);
  }, initialDelayMs);
}

function stopPolling() {
  if (pollingTimeout) {
    clearTimeout(pollingTimeout);
    clearInterval(pollingTimeout);
    pollingTimeout = null;
    logger.info('FHIR Polling Service Stopped.');
  }
}

module.exports = {
  startPolling,
  stopPolling,
  processFhirData
};
