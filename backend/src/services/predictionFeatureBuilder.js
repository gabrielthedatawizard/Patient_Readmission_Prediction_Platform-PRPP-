const HIGH_RISK_MEDICATION_PATTERNS = [
  'warfarin',
  'enoxaparin',
  'heparin',
  'insulin',
  'digoxin',
  'morphine',
  'tramadol',
  'prednisone',
  'furosemide',
  'spironolactone'
];

const DIAGNOSIS_GROUPS = [
  { name: 'heartFailure', prefixes: ['I50'], charlsonWeight: 2 },
  { name: 'diabetes', prefixes: ['E10', 'E11', 'E13', 'O24'], charlsonWeight: 1 },
  { name: 'ckd', prefixes: ['N18'], charlsonWeight: 2 },
  { name: 'copd', prefixes: ['J44'], charlsonWeight: 1 },
  { name: 'ischemicHeartDisease', prefixes: ['I20', 'I21', 'I25'], charlsonWeight: 1 },
  { name: 'stroke', prefixes: ['I63', 'I64', 'G45'], charlsonWeight: 1 },
  { name: 'cancer', prefixes: ['C'], charlsonWeight: 2 }
];

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeString(value) {
  const normalized = String(value || '').trim();
  return normalized || null;
}

function normalizeStringArray(value) {
  if (!value) {
    return [];
  }

  if (Array.isArray(value)) {
    return value
      .map((entry) => {
        if (typeof entry === 'string') {
          return normalizeString(entry);
        }

        if (entry && typeof entry === 'object') {
          return normalizeString(entry.code || entry.name || entry.label);
        }

        return null;
      })
      .filter(Boolean);
  }

  return String(value)
    .split(',')
    .map((entry) => normalizeString(entry))
    .filter(Boolean);
}

function normalizeMedicationEntries(value) {
  const entries = Array.isArray(value) ? value : normalizeStringArray(value);

  return entries
    .map((entry) => {
      if (typeof entry === 'string') {
        return {
          name: entry,
          category: null,
          highRisk: HIGH_RISK_MEDICATION_PATTERNS.some((pattern) =>
            entry.toLowerCase().includes(pattern)
          )
        };
      }

      if (entry && typeof entry === 'object') {
        const name = normalizeString(entry.name || entry.label || entry.code);
        if (!name) {
          return null;
        }

        return {
          name,
          category: normalizeString(entry.category),
          highRisk:
            entry.highRisk === true ||
            HIGH_RISK_MEDICATION_PATTERNS.some((pattern) =>
              name.toLowerCase().includes(pattern)
            )
        };
      }

      return null;
    })
    .filter(Boolean);
}

function uniqueStrings(values = []) {
  return Array.from(new Set(values.filter(Boolean)));
}

function getNestedValue(container, keys = []) {
  if (!container || typeof container !== 'object') {
    return null;
  }

  for (const key of keys) {
    if (container[key] !== undefined && container[key] !== null && container[key] !== '') {
      return container[key];
    }
  }

  return null;
}

function getFirstNumericValue(...candidates) {
  for (const candidate of candidates) {
    if (candidate === undefined || candidate === null || candidate === '') {
      continue;
    }

    const numeric = toNumber(candidate);
    if (numeric !== null) {
      return numeric;
    }
  }

  return null;
}

function getFirstDefinedValue(...candidates) {
  for (const candidate of candidates) {
    if (candidate !== undefined && candidate !== null && candidate !== '') {
      return candidate;
    }
  }

  return null;
}

function hasDiagnosisPrefix(diagnoses, prefixes) {
  return diagnoses.some((diagnosis) =>
    prefixes.some((prefix) => String(diagnosis).toUpperCase().startsWith(prefix))
  );
}

function deriveConditionFlags(diagnoses) {
  return {
    hasHeartFailure: hasDiagnosisPrefix(diagnoses, ['I50']),
    hasDiabetes: hasDiagnosisPrefix(diagnoses, ['E10', 'E11', 'E13', 'O24']),
    hasCkd: hasDiagnosisPrefix(diagnoses, ['N18'])
  };
}

function estimateCharlsonIndex({ diagnoses, fallbackValue }) {
  const provided = toNumber(fallbackValue);
  if (provided !== null) {
    return provided;
  }

  const matched = new Set();
  let score = 0;

  for (const group of DIAGNOSIS_GROUPS) {
    if (hasDiagnosisPrefix(diagnoses, group.prefixes)) {
      matched.add(group.name);
      score += group.charlsonWeight;
    }
  }

  return matched.size ? Math.min(score, 12) : 0;
}

function countPriorAdmissions(visits, currentVisit, days) {
  const currentAnchor = new Date(
    currentVisit?.admissionDate || currentVisit?.dischargeDate || Date.now()
  ).getTime();
  const windowStart = currentAnchor - days * 24 * 60 * 60 * 1000;

  return visits.filter((visit) => {
    if (!visit || !visit.admissionDate) {
      return false;
    }

    if (currentVisit?.id && visit.id === currentVisit.id) {
      return false;
    }

    const admissionTime = new Date(visit.admissionDate).getTime();
    return Number.isFinite(admissionTime) && admissionTime < currentAnchor && admissionTime >= windowStart;
  }).length;
}

function buildLabSummary({ egfr, hemoglobin, hba1c }) {
  const abnormal = [];

  if (egfr !== null && egfr < 60) {
    abnormal.push('reduced_kidney_function');
  }
  if (hemoglobin !== null && hemoglobin < 10) {
    abnormal.push('anemia');
  }
  if (hba1c !== null && hba1c >= 9) {
    abnormal.push('poor_glycemic_control');
  }

  return abnormal;
}

function buildSocialRiskFactors({ phoneAccess, transportationDifficulty, livesAlone }) {
  const flags = [];

  if (phoneAccess === false) {
    flags.push('no_phone_access');
  }
  if (transportationDifficulty) {
    flags.push('transport_barrier');
  }
  if (livesAlone) {
    flags.push('lives_alone');
  }

  return flags;
}

function buildPredictionFeatures({ patient, visit, visits = [], requestFeatures = {} }) {
  const clinicalProfile = patient?.clinicalProfile || {};
  const visitLabs = visit?.labResults || {};
  const visitVitals = visit?.vitalSigns || {};
  const visitSocial = visit?.socialFactors || {};
  const visitDiagnoses = normalizeStringArray(visit?.diagnoses);
  const diagnosisList = uniqueStrings([
    ...normalizeStringArray(requestFeatures.diagnoses),
    ...visitDiagnoses,
    normalizeString(requestFeatures.diagnosis),
    normalizeString(visit?.diagnosis),
    normalizeString(clinicalProfile.primaryDiagnosis)
  ]);

  const medications = normalizeMedicationEntries(
    getFirstDefinedValue(requestFeatures.medications, visit?.medications, clinicalProfile.medications, [])
  );
  const highRiskMedications = medications.filter((item) => item.highRisk);

  const lengthOfStayDays = getFirstNumericValue(
    requestFeatures.lengthOfStayDays,
    requestFeatures.lengthOfStay,
    visit?.lengthOfStay,
    clinicalProfile.lengthOfStayDays
  ) || 0;

  const priorAdmissions6mo = getFirstNumericValue(
    requestFeatures.priorAdmissions6mo,
    countPriorAdmissions(visits, visit, 180)
  ) || 0;
  const priorAdmissions12m = getFirstNumericValue(
    requestFeatures.priorAdmissions12m,
    countPriorAdmissions(visits, visit, 365),
    clinicalProfile.priorAdmissions12m
  ) || 0;

  const egfr = getFirstNumericValue(
    requestFeatures.egfr,
    getNestedValue(visitLabs, ['egfr', 'eGFR']),
    clinicalProfile.egfr
  );
  const hemoglobin = getFirstNumericValue(
    requestFeatures.hemoglobin,
    getNestedValue(visitLabs, ['hemoglobin', 'hb', 'Hb']),
    clinicalProfile.hemoglobin
  );
  const hba1c = getFirstNumericValue(
    requestFeatures.hba1c,
    getNestedValue(visitLabs, ['hba1c', 'HbA1c']),
    clinicalProfile.hba1c
  );
  const bpSystolic = getFirstNumericValue(
    requestFeatures.bpSystolic,
    getNestedValue(visitVitals, ['bpSystolic', 'sbp', 'systolic']),
    clinicalProfile.bpSystolic
  );
  const bpDiastolic = getFirstNumericValue(
    requestFeatures.bpDiastolic,
    getNestedValue(visitVitals, ['bpDiastolic', 'dbp', 'diastolic']),
    clinicalProfile.bpDiastolic
  );
  const icuStayDays = getFirstNumericValue(
    requestFeatures.icuStayDays,
    getNestedValue(visit?.socialFactors, ['icuStayDays']),
    clinicalProfile.icuStayDays
  ) || 0;

  const phoneAccess = Boolean(
    getFirstDefinedValue(requestFeatures.phoneAccess, visitSocial.phoneAccess, clinicalProfile.phoneAccess, false)
  );
  const transportationDifficulty = Boolean(
    getFirstDefinedValue(
      requestFeatures.transportationDifficulty,
      visitSocial.transportationDifficulty,
      clinicalProfile.transportationDifficulty,
      false
    )
  );
  const livesAlone = Boolean(
    getFirstDefinedValue(requestFeatures.livesAlone, visitSocial.livesAlone, clinicalProfile.livesAlone, false)
  );

  const charlsonIndex =
    estimateCharlsonIndex({
      diagnoses: diagnosisList,
      fallbackValue: getFirstDefinedValue(requestFeatures.charlsonIndex, clinicalProfile.charlsonIndex)
    }) || 0;

  const conditionFlags = deriveConditionFlags(diagnosisList);
  const labAbnormalities = buildLabSummary({ egfr, hemoglobin, hba1c });
  const socialRiskFactors = buildSocialRiskFactors({
    phoneAccess,
    transportationDifficulty,
    livesAlone
  });

  const featureSnapshot = {
    identifiers: {
      patientId: patient?.id || null,
      visitId: visit?.id || null,
      facilityId: patient?.facilityId || visit?.facilityId || null
    },
    demographics: {
      age: toNumber(getFirstDefinedValue(requestFeatures.age, patient?.age, clinicalProfile.age)) || 0,
      gender: normalizeString(getFirstDefinedValue(requestFeatures.gender, patient?.gender)) || 'unknown',
      insurance: patient?.insurance || null
    },
    encounter: {
      admissionDate: visit?.admissionDate || null,
      dischargeDate: visit?.dischargeDate || null,
      ward: visit?.ward || null,
      diagnosis: diagnosisList[0] || 'unknown',
      diagnoses: diagnosisList,
      dischargeDisposition: visit?.dischargeDisposition || null,
      lengthOfStayDays
    },
    utilization: {
      priorVisitsCount: Math.max(visits.length - (visit ? 1 : 0), 0),
      priorAdmissions6mo,
      priorAdmissions12m
    },
    medications: {
      count: medications.length,
      highRiskMedicationCount: highRiskMedications.length,
      highRiskMedicationNames: highRiskMedications.map((item) => item.name),
      names: medications.map((item) => item.name)
    },
    labs: {
      egfr,
      hemoglobin,
      hba1c
    },
    vitals: {
      bpSystolic,
      bpDiastolic
    },
    socialFactors: {
      phoneAccess,
      transportationDifficulty,
      livesAlone
    },
    conditionFlags,
    computed: {
      charlsonIndex,
      icuStayDays
    },
    requestOverrides: Object.keys(requestFeatures || {})
  };

  const modelFeatures = {
    age: featureSnapshot.demographics.age,
    gender: featureSnapshot.demographics.gender,
    diagnosis: featureSnapshot.encounter.diagnosis,
    diagnoses: diagnosisList,
    medicationCount: medications.length,
    highRiskMedicationCount: highRiskMedications.length,
    priorAdmissions6mo,
    priorAdmissions12m,
    lengthOfStay: lengthOfStayDays,
    lengthOfStayDays,
    charlsonIndex,
    egfr,
    hemoglobin,
    hba1c,
    bpSystolic,
    bpDiastolic,
    icuStayDays,
    phoneAccess,
    transportationDifficulty,
    livesAlone,
    hasHeartFailure: conditionFlags.hasHeartFailure,
    hasDiabetes: conditionFlags.hasDiabetes,
    hasCkd: conditionFlags.hasCkd
  };

  const analysisSummary = {
    diagnosisCount: diagnosisList.length,
    labAbnormalities,
    socialRiskFactors,
    medicationRiskProfile:
      highRiskMedications.length >= 2 ? 'high' : highRiskMedications.length === 1 ? 'moderate' : 'low',
    utilizationRiskProfile:
      priorAdmissions12m >= 3 ? 'high' : priorAdmissions12m >= 1 ? 'moderate' : 'low',
    missingData: ['egfr', 'hemoglobin', 'hba1c', 'bpSystolic', 'bpDiastolic'].filter(
      (field) => modelFeatures[field] === null
    )
  };

  return {
    modelFeatures,
    featureSnapshot,
    analysisSummary
  };
}

module.exports = {
  buildPredictionFeatures
};
