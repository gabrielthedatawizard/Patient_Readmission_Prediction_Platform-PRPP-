const logger = require('../utils/logger');
const { listPatientsForUser } = require('../data');

// Mock external National Client Registry URL config
const CR_BASE_URL = process.env.CLIENT_REGISTRY_BASE_URL || 'http://localhost:8081/cr';

/**
 * Normalizes strings for matching
 * @param {string} str 
 */
function normalizeStr(str) {
  if (!str) return '';
  return String(str).toLowerCase().trim().replace(/[^a-z0-9]/g, '');
}

/**
 * Searches the internal Data Layer for an existing patient that matches
 * the incoming FHIR patient data using deterministic algorithms.
 * NIDA Identity matching hierarchy:
 * 1. NIDA ID (National ID)
 * 2. Mobile Phone Number
 * 3. Exact Name + DOB Match
 * 
 * @param {Object} systemUser - The moh/system user
 * @param {Object} incomingPatient - The parsed FHIR patient object containing identifiers
 * @returns {String|null} Existing internal patientId if found, else null.
 */
function resolvePatientIdentity(systemUser, incomingPatient) {
  // Extract identifiers from incoming FHIR payload
  const incomingNida = incomingPatient.identifiers?.find(i => i.system === 'NIDA')?.value;
  const incomingPhone = normalizeStr(incomingPatient.phone);
  const incomingName = normalizeStr(incomingPatient.name);
  const incomingAge = incomingPatient.age; // DOB usually normalized to age for standard matching

  if (!incomingNida && !incomingPhone && !incomingName) {
     return null;
  }

  // Retrieve all globally visible patients (systemUser sees all facilities since role: moh)
  const allPatients = listPatientsForUser(systemUser);

  // Pass 1: Exact NIDA / National ID Match
  if (incomingNida) {
    const match = allPatients.find(p => {
      // Assuming existing patients have identifiers array; for mock we check clinicalProfile or metadata if set
      const pNida = p.identifiers?.find(i => i.system === 'NIDA')?.value || p.nidaId;
      return pNida === incomingNida;
    });
    if (match) {
       logger.info(`Resolved identity via NIDA ID match: ${match.id}`);
       return match.id;
    }
  }

  // Pass 2: Exact Phone Match
  if (incomingPhone) {
    const match = allPatients.find(p => normalizeStr(p.phone) === incomingPhone);
    if (match) {
       logger.info(`Resolved identity via Phone match: ${match.id}`);
       return match.id;
    }
  }

  // Pass 3: Name + Age Match (Heuristic)
  if (incomingName) {
    const match = allPatients.find(p => {
       const pName = normalizeStr(p.name);
       const ageDiff = Math.abs((p.age || 0) - (incomingAge || 0));
       // If name matches exactly after stripping whitespace/special chars, and age is within 1 year
       return pName === incomingName && ageDiff <= 1;
    });
    if (match) {
       logger.info(`Resolved identity via Name + Age heuristic match: ${match.id}`);
       return match.id;
    }
  }

  return null; // No match found, must create a new record
}

/**
 * Optinally syncs metadata out to the Client Registry.
 * @param {*} patientData 
 */
async function syncToClientRegistry(patientData) {
  try {
     logger.debug(`Syncing patient ${patientData.id} to National Client Registry`);
     // In a real implementation: fetch(CR_BASE_URL, { method: 'POST', body: ... })
     return true;
  } catch(e) {
     logger.error(`Failed to sync to CR: ${e.message}`);
     return false;
  }
}

module.exports = {
  resolvePatientIdentity,
  syncToClientRegistry
};
