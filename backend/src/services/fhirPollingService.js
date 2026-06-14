const { pollNewEncounters } = require('../integrations/fhirMediator');
const { resolvePatientIdentity } = require('../integrations/clientRegistryMediator');
const { fetchPatientCtcRecords } = require('../integrations/ctc2Mediator');
const { fetchDispensedMedications } = require('../integrations/elmisMediator');
const { getPatientForUser, createPatientForUser, updatePatientForUser, getVisitForUser, createVisitForUser } = require('../data');
const logger = require('../utils/logger');

const POLLING_INTERVAL_MS = 1000 * 60 * 5; // 5 minutes default

let pollingTimeout = null;
let lastPollTime = new Date(Date.now() - 24 * 60 * 60 * 1000); // Start 24h ago
let pollHistory = [];
const MAX_HISTORY = 20;

const systemUser = {
  id: 'system-fhir-poller',
  role: 'moh', // Grants national-level access, allowing insertion to any facility
  facilityId: null,
  regionCode: null,
  district: null
};

async function processFhirData() {
  const fhirBaseUrl = process.env.FHIR_BASE_URL;
  if (!fhirBaseUrl) {
    logger.debug('FHIR Polling skipped: FHIR_BASE_URL not configured.');
    return;
  }

  logger.info(`Polling FHIR server for new encounters since ${lastPollTime.toISOString()}`);
  
  try {
    const { patients, encounters, rawCounts } = await pollNewEncounters(fhirBaseUrl, lastPollTime);
    
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

        // --- CTC2 + eLMIS Enrichment ---
        const nidaId = (p.identifiers || []).find(i => i.system === 'NIDA')?.value;
        const enrichment = {};

        if (nidaId) {
          try {
            const ctcProfile = await fetchPatientCtcRecords(nidaId);
            if (ctcProfile) {
              Object.assign(enrichment, ctcProfile);
              logger.info(`CTC2 enrichment applied for patient ${p.fhirId}`);
            }
          } catch (ctcErr) {
            logger.warn(`CTC2 enrichment failed for ${p.fhirId}: ${ctcErr.message}`);
          }
        }

        try {
          const medsData = await fetchDispensedMedications(nidaId || p.fhirId, lastPollTime);
          if (medsData) {
            Object.assign(enrichment, medsData);
            logger.info(`eLMIS enrichment applied for patient ${p.fhirId}`);
          }
        } catch (elErr) {
          logger.warn(`eLMIS enrichment failed for ${p.fhirId}: ${elErr.message}`);
        }

        if (Object.keys(enrichment).length > 0) {
          await updatePatientForUser(systemUser, p.fhirId, enrichment);
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

    // Update cursor and record history
    lastPollTime = new Date();
    pollHistory.unshift({
      polledAt: lastPollTime.toISOString(),
      patients: patients.length,
      encounters: encounters.length,
      rawCounts,
      status: 'success'
    });
    if (pollHistory.length > MAX_HISTORY) pollHistory.length = MAX_HISTORY;

  } catch (error) {
    logger.error('FHIR Polling failed:', error);
    pollHistory.unshift({
      polledAt: new Date().toISOString(),
      status: 'error',
      error: String(error.message || error)
    });
    if (pollHistory.length > MAX_HISTORY) pollHistory.length = MAX_HISTORY;
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

function getPollingStatus() {
  const fhirBaseUrl = process.env.FHIR_BASE_URL;
  return {
    configured: Boolean(fhirBaseUrl),
    fhirBaseUrl: fhirBaseUrl || null,
    isRunning: pollingTimeout !== null,
    intervalMs: POLLING_INTERVAL_MS,
    lastPollTime: lastPollTime.toISOString(),
    nextPollEstimate: pollingTimeout
      ? new Date(lastPollTime.getTime() + POLLING_INTERVAL_MS).toISOString()
      : null,
    historyCount: pollHistory.length
  };
}

async function triggerImmediatePoll() {
  logger.info('Manual FHIR poll triggered.');
  await processFhirData();
  return pollHistory[0] || { status: 'no_result' };
}

function getPollHistory(limit = 10) {
  return pollHistory.slice(0, Math.min(limit, MAX_HISTORY));
}

module.exports = {
  startPolling,
  stopPolling,
  processFhirData,
  getPollingStatus,
  triggerImmediatePoll,
  getPollHistory
};
