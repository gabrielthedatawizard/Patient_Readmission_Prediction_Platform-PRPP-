/**
 * eLMIS (Electronic Logistics Management Information System) Mediator
 * 
 * Integrates with Tanzania's eLMIS to pull structured medication
 * dispensing data, replacing manual medication entry with real
 * pharmacy dispensing records.
 * 
 * Configuration:
 *   ELMIS_BASE_URL  — Base URL of the eLMIS API endpoint
 *   ELMIS_API_KEY   — API key for authentication (if required)
 */

const logger = require('../utils/logger');

const ELMIS_BASE_URL = process.env.ELMIS_BASE_URL || '';
const ELMIS_API_KEY = process.env.ELMIS_API_KEY || '';

const HIGH_RISK_PATTERNS = [
  'warfarin', 'enoxaparin', 'heparin', 'insulin', 'digoxin',
  'morphine', 'tramadol', 'prednisone', 'furosemide', 'spironolactone',
  'methotrexate', 'cyclosporine', 'lithium', 'phenytoin', 'theophylline'
];

function isConfigured() {
  return Boolean(ELMIS_BASE_URL.trim());
}

function parseDateSafe(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/**
 * Maps raw eLMIS dispensing records to TRIP medication format.
 * @param {Array} dispensingRecords - Array of eLMIS dispensing entries
 * @returns {Object} Medication enrichment for TRIP patient profile
 */
function mapElmisMedsToTripFormat(dispensingRecords) {
  if (!Array.isArray(dispensingRecords) || !dispensingRecords.length) {
    return null;
  }

  const medications = [];
  const medicationCodes = [];

  for (const record of dispensingRecords) {
    const name = String(
      record.product_name || record.productName ||
      record.drug_name || record.drugName ||
      record.name || ''
    ).trim();

    const code = String(
      record.product_code || record.productCode ||
      record.drug_code || record.drugCode ||
      record.code || ''
    ).trim();

    if (!name && !code) continue;

    if (name && !medications.includes(name)) {
      medications.push(name);
    }
    if (code && !medicationCodes.includes(code)) {
      medicationCodes.push(code);
    }
  }

  const highRiskMedications = medications.filter(med =>
    HIGH_RISK_PATTERNS.some(pattern => med.toLowerCase().includes(pattern))
  );

  const latestDispenseDate = dispensingRecords
    .map(r => parseDateSafe(r.dispense_date || r.dispensedAt || r.date))
    .filter(Boolean)
    .sort()
    .pop() || null;

  return {
    medications,
    medicationCodes,
    medicationCount: medications.length,
    highRiskMedicationCount: highRiskMedications.length,
    highRiskMedications,
    lastDispenseDate: latestDispenseDate,
    elmisDataSource: 'elmis',
    elmisSyncedAt: new Date().toISOString()
  };
}

/**
 * Fetches dispensed medications from eLMIS for a patient.
 * @param {string} patientId - Patient identifier (national ID or facility patient ID)
 * @param {Date|string} since - Only fetch records after this date
 * @returns {Promise<Object|null>} Mapped medication enrichment, or null
 */
async function fetchDispensedMedications(patientId, since) {
  if (!isConfigured()) {
    logger.debug('eLMIS enrichment skipped: ELMIS_BASE_URL not configured.');
    return null;
  }

  if (!patientId) {
    return null;
  }

  let fetch;
  try {
    fetch = require('node-fetch');
  } catch {
    logger.warn('eLMIS enrichment skipped: node-fetch not installed.');
    return null;
  }

  const base = ELMIS_BASE_URL.replace(/\/$/, '');
  const sinceParam = since instanceof Date
    ? since.toISOString()
    : (since || new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString());

  const headers = { Accept: 'application/json' };
  if (ELMIS_API_KEY) {
    headers['X-API-Key'] = ELMIS_API_KEY;
  }

  try {
    const url = `${base}/dispensing/${encodeURIComponent(patientId)}?since=${encodeURIComponent(sinceParam)}`;
    const response = await fetch(url, { method: 'GET', headers, timeout: 10000 });

    if (!response.ok) {
      if (response.status === 404) {
        logger.debug(`eLMIS: No dispensing records for ${patientId}`);
        return null;
      }
      logger.warn(`eLMIS API returned ${response.status} for ${patientId}`);
      return null;
    }

    const data = await response.json();
    const records = Array.isArray(data) ? data : (data.records || data.dispensings || []);
    return mapElmisMedsToTripFormat(records);
  } catch (error) {
    logger.error(`eLMIS fetch failed for ${patientId}: ${error.message}`);
    return null;
  }
}

module.exports = {
  isConfigured,
  fetchDispensedMedications,
  mapElmisMedsToTripFormat
};
