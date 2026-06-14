/**
 * CTC2 (Care & Treatment Clinic) Mediator
 * 
 * Integrates with Tanzania's CTC2 database to pull HIV treatment status,
 * CD4 counts, viral load, and ART regimen data for patient enrichment.
 * 
 * Configuration:
 *   CTC2_BASE_URL  — Base URL of the CTC2 API endpoint
 *   CTC2_API_KEY   — API key for authentication (if required)
 */

const logger = require('../utils/logger');

const CTC2_BASE_URL = process.env.CTC2_BASE_URL || '';
const CTC2_API_KEY = process.env.CTC2_API_KEY || '';

function isConfigured() {
  return Boolean(CTC2_BASE_URL.trim());
}

function parseDateSafe(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function toFloat(value) {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/**
 * Maps a raw CTC2 record to TRIP clinical profile fields.
 * @param {Object} ctcRecord - A CTC2 patient record
 * @returns {Object} Enrichment fields for the TRIP patient clinical profile
 */
function mapCtcToTripProfile(ctcRecord) {
  if (!ctcRecord) return null;

  const cd4Count = toFloat(ctcRecord.cd4_count || ctcRecord.cd4Count || ctcRecord.cd4);
  const viralLoad = toFloat(ctcRecord.viral_load || ctcRecord.viralLoad);
  const artStartDate = parseDateSafe(ctcRecord.art_start_date || ctcRecord.artStartDate);
  const lastVisitDate = parseDateSafe(ctcRecord.last_visit_date || ctcRecord.lastVisitDate);

  const artRegimen = String(ctcRecord.art_regimen || ctcRecord.artRegimen || ctcRecord.regimen || '').trim() || null;
  const artStatus = String(ctcRecord.art_status || ctcRecord.artStatus || ctcRecord.status || '').trim().toLowerCase();

  const isOnArt = ['active', 'on_art', 'on-art', 'current', 'treated', 'continuing'].includes(artStatus);
  const isHivPositive = Boolean(
    ctcRecord.hiv_positive !== undefined ? ctcRecord.hiv_positive :
    ctcRecord.hivPositive !== undefined ? ctcRecord.hivPositive :
    artStatus && artStatus !== 'negative'
  );

  const viralLoadSuppressed = viralLoad !== null ? viralLoad < 1000 : null;

  return {
    hasHiv: isHivPositive,
    onArt: isOnArt,
    artRegimen,
    artStartDate,
    cd4Count,
    viralLoad,
    viralLoadSuppressed,
    lastCtcVisitDate: lastVisitDate,
    ctcDataSource: 'ctc2',
    ctcSyncedAt: new Date().toISOString()
  };
}

/**
 * Fetches CTC2 records for a patient using their national ID.
 * @param {string} nationalId - NIDA or CTC2 patient identifier
 * @returns {Promise<Object|null>} The mapped TRIP profile enrichment, or null
 */
async function fetchPatientCtcRecords(nationalId) {
  if (!isConfigured()) {
    logger.debug('CTC2 enrichment skipped: CTC2_BASE_URL not configured.');
    return null;
  }

  if (!nationalId) {
    return null;
  }

  let fetch;
  try {
    fetch = require('node-fetch');
  } catch {
    logger.warn('CTC2 enrichment skipped: node-fetch not installed.');
    return null;
  }

  const base = CTC2_BASE_URL.replace(/\/$/, '');
  const headers = { Accept: 'application/json' };
  if (CTC2_API_KEY) {
    headers['X-API-Key'] = CTC2_API_KEY;
  }

  try {
    const response = await fetch(`${base}/patients/${encodeURIComponent(nationalId)}/ctc-summary`, {
      method: 'GET',
      headers,
      timeout: 10000
    });

    if (!response.ok) {
      if (response.status === 404) {
        logger.debug(`CTC2: No record found for ${nationalId}`);
        return null;
      }
      logger.warn(`CTC2 API returned ${response.status} for ${nationalId}`);
      return null;
    }

    const data = await response.json();
    return mapCtcToTripProfile(data);
  } catch (error) {
    logger.error(`CTC2 fetch failed for ${nationalId}: ${error.message}`);
    return null;
  }
}

module.exports = {
  isConfigured,
  fetchPatientCtcRecords,
  mapCtcToTripProfile
};
