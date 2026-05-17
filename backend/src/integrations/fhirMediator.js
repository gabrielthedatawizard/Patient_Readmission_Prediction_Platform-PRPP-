/**
 * FHIR R4 Mediator — GoT-HoMIS / Afya eHMS integration stub
 *
 * Architecture stub. Polling GoT-HoMIS or Afya eHMS requires a bilateral
 * data-sharing agreement and network access to the national FHIR endpoint.
 * These functions define the interface and mapping logic; they are not yet
 * wired to a live FHIR server.
 *
 * Functions:
 *   pollNewEncounters(fhirBaseUrl, since)          — GET Patient + Encounter + Condition
 *   mapFhirEncounterToTripVisit(fhirBundle)        — FHIR → TRIP Visit schema
 *   mapFhirPatientToTripPatient(fhirPatient)       — FHIR → TRIP Patient schema
 */

const ICD10_MALARIA   = /^B5[0-4]/;
const ICD10_TB        = /^A1[5-9]/;
const ICD10_SAM       = /^E4[0-6]/;
const ICD10_SICKLE    = /^D57/;

function extractCodingDisplay(codeableConcept) {
  if (!codeableConcept) return null;
  const coding = Array.isArray(codeableConcept.coding) ? codeableConcept.coding[0] : null;
  return coding?.display || codeableConcept.text || null;
}

function extractIcdCode(codeableConcept) {
  if (!codeableConcept) return null;
  const coding = Array.isArray(codeableConcept.coding)
    ? codeableConcept.coding.find((c) => c.system?.includes('icd'))
    : null;
  return coding?.code || null;
}

function resolveReference(ref) {
  if (!ref) return null;
  const str = ref.reference || ref;
  return typeof str === 'string' ? str.split('/').pop() : null;
}

function mapFhirPatientToTripPatient(fhirPatient) {
  if (!fhirPatient || fhirPatient.resourceType !== 'Patient') {
    return null;
  }

  const officialName = (fhirPatient.name || []).find((n) => n.use === 'official') ||
    fhirPatient.name?.[0] || {};
  const givenNames = Array.isArray(officialName.given) ? officialName.given.join(' ') : '';
  const family = officialName.family || '';
  const name = [givenNames, family].filter(Boolean).join(' ') || 'Unknown';

  const phone = (fhirPatient.telecom || []).find((t) => t.system === 'phone')?.value || null;

  const addressEntry = fhirPatient.address?.[0] || {};
  const address = [
    addressEntry.line?.join(', '),
    addressEntry.city,
    addressEntry.district,
    addressEntry.country
  ].filter(Boolean).join(', ') || null;

  const birthDate = fhirPatient.birthDate ? new Date(fhirPatient.birthDate) : null;
  const age = birthDate
    ? Math.floor((Date.now() - birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000))
    : null;

  const genderMap = { male: 'male', female: 'female', other: 'other', unknown: 'other' };
  const gender = genderMap[fhirPatient.gender] || 'other';

  return {
    fhirId: fhirPatient.id,
    name,
    age,
    gender,
    phone,
    address,
    identifiers: (fhirPatient.identifier || []).map((id) => ({
      system: id.system || null,
      value: id.value || null
    }))
  };
}

function mapFhirEncounterToTripVisit(encounter, conditions = []) {
  if (!encounter || encounter.resourceType !== 'Encounter') {
    return null;
  }

  const patientId = resolveReference(encounter.subject);
  const facilityId = resolveReference(encounter.serviceProvider) || null;

  const periodStart = encounter.period?.start || null;
  const periodEnd   = encounter.period?.end   || null;

  const lengthOfStay = periodStart && periodEnd
    ? Math.max(0, Math.round(
        (new Date(periodEnd) - new Date(periodStart)) / (24 * 60 * 60 * 1000)
      ))
    : null;

  const diagnoses = conditions
    .filter((c) => resolveReference(c.subject) === patientId)
    .map((c) => extractCodingDisplay(c.code))
    .filter(Boolean);

  const diagnosisCodes = conditions
    .filter((c) => resolveReference(c.subject) === patientId)
    .map((c) => extractIcdCode(c.code))
    .filter(Boolean);

  const hasMalaria  = diagnosisCodes.some((code) => ICD10_MALARIA.test(code));
  const hasTb       = diagnosisCodes.some((code) => ICD10_TB.test(code));
  const hasSam      = diagnosisCodes.some((code) => ICD10_SAM.test(code));
  const hasSickle   = diagnosisCodes.some((code) => ICD10_SICKLE.test(code));

  return {
    fhirEncounterId: encounter.id,
    fhirPatientId: patientId,
    fhirFacilityId: facilityId,
    admissionDate: periodStart,
    dischargeDate: periodEnd,
    lengthOfStay,
    diagnosis: diagnoses[0] || null,
    diagnoses,
    diagnosisCodes,
    clinicalProfile: {
      hasMalaria,
      hasTuberculosis: hasTb,
      hasSevereAcuteMalnutrition: hasSam,
      hasSickleCellDisease: hasSickle
    }
  };
}

async function pollNewEncounters(fhirBaseUrl, since) {
  const sinceParam = since instanceof Date
    ? since.toISOString()
    : (since || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

  const fetch = (() => {
    try { return require('node-fetch'); } catch { return null; }
  })();

  if (!fetch) {
    throw new Error('node-fetch is not installed. Run: npm install node-fetch');
  }

  const base = String(fhirBaseUrl || '').replace(/\/$/, '');

  const [patientRes, encounterRes, conditionRes] = await Promise.all([
    fetch(`${base}/Patient?_lastUpdated=gt${sinceParam}&_format=json`),
    fetch(`${base}/Encounter?date=gt${sinceParam}&_format=json`),
    fetch(`${base}/Condition?recorded-date=gt${sinceParam}&_format=json`)
  ]);

  const [patientBundle, encounterBundle, conditionBundle] = await Promise.all([
    patientRes.json(),
    encounterRes.json(),
    conditionRes.json()
  ]);

  const patients   = (patientBundle.entry   || []).map((e) => e.resource).filter(Boolean);
  const encounters = (encounterBundle.entry  || []).map((e) => e.resource).filter(Boolean);
  const conditions = (conditionBundle.entry  || []).map((e) => e.resource).filter(Boolean);

  return {
    patients:   patients.map(mapFhirPatientToTripPatient).filter(Boolean),
    encounters: encounters.map((enc) => mapFhirEncounterToTripVisit(enc, conditions)).filter(Boolean),
    rawCounts: {
      patients: patients.length,
      encounters: encounters.length,
      conditions: conditions.length
    }
  };
}

module.exports = {
  pollNewEncounters,
  mapFhirEncounterToTripVisit,
  mapFhirPatientToTripPatient
};
