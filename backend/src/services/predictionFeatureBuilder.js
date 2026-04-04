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

const ART_MEDICATION_PATTERNS = [
  'dolutegravir',
  'tenofovir',
  'lamivudine',
  'efavirenz',
  'zidovudine',
  'abacavir',
  'lopinavir',
  'ritonavir',
  'atazanavir',
  'nevirapine',
  'emtricitabine'
];

const DIAGNOSIS_GROUPS = [
  { name: 'malaria', prefixes: ['B50', 'B51', 'B52', 'B53', 'B54'], charlsonWeight: 1 },
  { name: 'hiv', prefixes: ['B20', 'B21', 'B22', 'B23', 'B24'], charlsonWeight: 2 },
  { name: 'tb', prefixes: ['A15', 'A16', 'A17', 'A18', 'A19'], charlsonWeight: 1 },
  { name: 'sam', prefixes: ['E43', 'E44', 'E45', 'E46'], charlsonWeight: 1 },
  { name: 'sickleCell', prefixes: ['D57'], charlsonWeight: 2 },
  { name: 'copd', prefixes: ['J44'], charlsonWeight: 1 },
  { name: 'cancer', prefixes: ['C'], charlsonWeight: 2 }
];

const TANZANIA_PRIORITY_PREFIXES = {
  malaria: ['B50', 'B51', 'B52', 'B53', 'B54', 'P37.3'],
  hiv: ['B20', 'B21', 'B22', 'B23', 'B24', 'Z21', 'R75'],
  tuberculosis: ['A15', 'A16', 'A17', 'A18', 'A19'],
  severeAcuteMalnutrition: ['E40', 'E41', 'E42', 'E43'],
  sickleCellDisease: ['D57'],
  neonatal: ['P', 'Z38']
};

const NEONATAL_WARD_PATTERNS = ['nicu', 'neonat', 'newborn', 'scbu', 'special care baby'];

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toBoolean(value) {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'number') {
    return value !== 0;
  }

  const normalized = String(value).trim().toLowerCase();

  if (
    ['true', '1', 'yes', 'y', 'on_art', 'on-art', 'active', 'current', 'treated'].includes(
      normalized
    )
  ) {
    return true;
  }

  if (
    ['false', '0', 'no', 'n', 'off_art', 'off-art', 'none', 'stopped', 'inactive'].includes(
      normalized
    )
  ) {
    return false;
  }

  return null;
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

function getFirstBooleanValue(...candidates) {
  for (const candidate of candidates) {
    const booleanValue = toBoolean(candidate);
    if (booleanValue !== null) {
      return booleanValue;
    }
  }

  return null;
}

function hasDiagnosisPrefix(diagnoses, prefixes) {
  return diagnoses.some((diagnosis) =>
    prefixes.some((prefix) => String(diagnosis).toUpperCase().startsWith(prefix))
  );
}

function hasMedicationPattern(medications, patterns) {
  return medications.some((medication) =>
    patterns.some((pattern) => medication.name.toLowerCase().includes(pattern))
  );
}

function resolveConditionFlag(explicitCandidates, fallbackValue) {
  const explicit = getFirstBooleanValue(...explicitCandidates);
  return explicit !== null ? explicit : Boolean(fallbackValue);
}

function buildNeonatalRiskContext({
  ageYears,
  diagnoses,
  requestFeatures = {},
  clinicalProfile = {},
  visit = null
}) {
  const ageInDays = getFirstNumericValue(
    requestFeatures.ageInDays,
    requestFeatures.neonatalAgeDays,
    clinicalProfile.ageInDays,
    clinicalProfile.neonatalAgeDays
  );
  const gestationalAgeWeeks = getFirstNumericValue(
    requestFeatures.gestationalAgeWeeks,
    clinicalProfile.gestationalAgeWeeks
  );
  const birthWeightGrams = getFirstNumericValue(
    requestFeatures.birthWeightGrams,
    clinicalProfile.birthWeightGrams
  );
  const ward = normalizeString(
    getFirstDefinedValue(requestFeatures.ward, visit?.ward, clinicalProfile.ward)
  );
  const explicitFlag = getFirstBooleanValue(
    requestFeatures.neonatalRisk,
    clinicalProfile.neonatalRisk,
    clinicalProfile.isNeonate
  );

  const neonatalRiskFactors = [];

  if (explicitFlag === true) {
    neonatalRiskFactors.push('explicit_neonatal_flag');
  }
  if (ageInDays !== null && ageInDays <= 28) {
    neonatalRiskFactors.push('age_under_28_days');
  } else if (ageYears !== null && ageYears === 0) {
    neonatalRiskFactors.push('age_recorded_as_zero_years');
  }
  if (hasDiagnosisPrefix(diagnoses, TANZANIA_PRIORITY_PREFIXES.neonatal)) {
    neonatalRiskFactors.push('neonatal_diagnosis');
  }
  if (ward && NEONATAL_WARD_PATTERNS.some((pattern) => ward.toLowerCase().includes(pattern))) {
    neonatalRiskFactors.push('neonatal_ward');
  }
  if (birthWeightGrams !== null && birthWeightGrams < 2500) {
    neonatalRiskFactors.push('low_birth_weight');
  }
  if (gestationalAgeWeeks !== null && gestationalAgeWeeks < 37) {
    neonatalRiskFactors.push('prematurity');
  }

  return {
    neonatalRisk:
      explicitFlag === true || Array.from(new Set(neonatalRiskFactors)).length > 0,
    neonatalRiskFactors: Array.from(new Set(neonatalRiskFactors)),
    ageInDays,
    gestationalAgeWeeks,
    birthWeightGrams
  };
}

function deriveConditionFlags({
  diagnoses,
  medications,
  requestFeatures = {},
  clinicalProfile = {},
  ageYears,
  visit = null
}) {
  const artMedicationDetected = hasMedicationPattern(medications, ART_MEDICATION_PATTERNS);
  const neonatalContext = buildNeonatalRiskContext({
    ageYears,
    diagnoses,
    requestFeatures,
    clinicalProfile,
    visit
  });

  const hasHiv = resolveConditionFlag(
    [
      requestFeatures.hasHiv,
      requestFeatures.hivPositive,
      clinicalProfile.hasHiv,
      clinicalProfile.hivPositive
    ],
    hasDiagnosisPrefix(diagnoses, TANZANIA_PRIORITY_PREFIXES.hiv)
  );

  return {
    hasHeartFailure: hasDiagnosisPrefix(diagnoses, ['I50']),
    hasDiabetes: hasDiagnosisPrefix(diagnoses, ['E10', 'E11', 'E13', 'O24']),
    hasCkd: hasDiagnosisPrefix(diagnoses, ['N18']),
    hasMalaria: resolveConditionFlag(
      [requestFeatures.hasMalaria, clinicalProfile.hasMalaria],
      hasDiagnosisPrefix(diagnoses, TANZANIA_PRIORITY_PREFIXES.malaria)
    ),
    hasHiv,
    onArt: resolveConditionFlag(
      [requestFeatures.onArt, requestFeatures.artStatus, clinicalProfile.onArt, clinicalProfile.artStatus],
      hasHiv && artMedicationDetected
    ),
    hasTuberculosis: resolveConditionFlag(
      [requestFeatures.hasTuberculosis, requestFeatures.hasTb, clinicalProfile.hasTuberculosis, clinicalProfile.hasTb],
      hasDiagnosisPrefix(diagnoses, TANZANIA_PRIORITY_PREFIXES.tuberculosis)
    ),
    hasSevereAcuteMalnutrition: resolveConditionFlag(
      [
        requestFeatures.hasSevereAcuteMalnutrition,
        requestFeatures.hasSam,
        clinicalProfile.hasSevereAcuteMalnutrition,
        clinicalProfile.hasSam
      ],
      hasDiagnosisPrefix(diagnoses, TANZANIA_PRIORITY_PREFIXES.severeAcuteMalnutrition)
    ),
    hasSickleCellDisease: resolveConditionFlag(
      [
        requestFeatures.hasSickleCellDisease,
        requestFeatures.hasSickleCell,
        clinicalProfile.hasSickleCellDisease,
        clinicalProfile.hasSickleCell
      ],
      hasDiagnosisPrefix(diagnoses, TANZANIA_PRIORITY_PREFIXES.sickleCellDisease)
    ),
    neonatalRisk: neonatalContext.neonatalRisk,
    neonatalRiskFactors: neonatalContext.neonatalRiskFactors,
    ageInDays: neonatalContext.ageInDays,
    gestationalAgeWeeks: neonatalContext.gestationalAgeWeeks,
    birthWeightGrams: neonatalContext.birthWeightGrams,
    artMedicationDetected
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

function buildTanzaniaPriorityConditions(conditionFlags) {
  const flags = [];

  if (conditionFlags.hasMalaria) {
    flags.push('malaria');
  }
  if (conditionFlags.hasHiv) {
    flags.push('hiv');
  }
  if (conditionFlags.onArt) {
    flags.push('on_art');
  }
  if (conditionFlags.hasTuberculosis) {
    flags.push('tuberculosis');
  }
  if (conditionFlags.hasSevereAcuteMalnutrition) {
    flags.push('severe_acute_malnutrition');
  }
  if (conditionFlags.hasSickleCellDisease) {
    flags.push('sickle_cell_disease');
  }
  if (conditionFlags.neonatalRisk) {
    flags.push('neonatal_risk');
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
  const ageYears = toNumber(getFirstDefinedValue(requestFeatures.age, patient?.age, clinicalProfile.age)) || 0;

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

  const phoneAccess =
    getFirstBooleanValue(
      requestFeatures.phoneAccess,
      visitSocial.phoneAccess,
      clinicalProfile.phoneAccess
    ) ?? false;
  const transportationDifficulty =
    getFirstBooleanValue(
      requestFeatures.transportationDifficulty,
      visitSocial.transportationDifficulty,
      clinicalProfile.transportationDifficulty
    ) ?? false;
  const livesAlone =
    getFirstBooleanValue(
      requestFeatures.livesAlone,
      visitSocial.livesAlone,
      clinicalProfile.livesAlone
    ) ?? false;

  const charlsonIndex =
    estimateCharlsonIndex({
      diagnoses: diagnosisList,
      fallbackValue: getFirstDefinedValue(requestFeatures.charlsonIndex, clinicalProfile.charlsonIndex)
    }) || 0;

  const conditionFlags = deriveConditionFlags({
    diagnoses: diagnosisList,
    medications,
    requestFeatures,
    clinicalProfile,
    ageYears,
    visit
  });
  const labAbnormalities = buildLabSummary({ egfr, hemoglobin, hba1c });
  const socialRiskFactors = buildSocialRiskFactors({
    phoneAccess,
    transportationDifficulty,
    livesAlone
  });
  const tanzaniaPriorityConditions = buildTanzaniaPriorityConditions(conditionFlags);

  const featureSnapshot = {
    identifiers: {
      patientId: patient?.id || null,
      visitId: visit?.id || null,
      facilityId: patient?.facilityId || visit?.facilityId || null
    },
    demographics: {
      age: ageYears,
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
    conditionFlags: {
      hasHeartFailure: conditionFlags.hasHeartFailure,
      hasDiabetes: conditionFlags.hasDiabetes,
      hasCkd: conditionFlags.hasCkd,
      hasMalaria: conditionFlags.hasMalaria,
      hasHiv: conditionFlags.hasHiv,
      hasTuberculosis: conditionFlags.hasTuberculosis,
      hasSevereAcuteMalnutrition: conditionFlags.hasSevereAcuteMalnutrition,
      hasSickleCellDisease: conditionFlags.hasSickleCellDisease,
      neonatalRisk: conditionFlags.neonatalRisk
    },
    tanzaniaContext: {
      onArt: conditionFlags.onArt,
      artMedicationDetected: conditionFlags.artMedicationDetected,
      neonatalRiskFactors: conditionFlags.neonatalRiskFactors,
      ageInDays: conditionFlags.ageInDays,
      gestationalAgeWeeks: conditionFlags.gestationalAgeWeeks,
      birthWeightGrams: conditionFlags.birthWeightGrams,
      priorityConditions: tanzaniaPriorityConditions
    },
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
    hasCkd: conditionFlags.hasCkd,
    hasMalaria: conditionFlags.hasMalaria,
    hasHiv: conditionFlags.hasHiv,
    onArt: conditionFlags.onArt,
    hasTuberculosis: conditionFlags.hasTuberculosis,
    hasSevereAcuteMalnutrition: conditionFlags.hasSevereAcuteMalnutrition,
    hasSickleCellDisease: conditionFlags.hasSickleCellDisease,
    neonatalRisk: conditionFlags.neonatalRisk
  };

  const analysisSummary = {
    diagnosisCount: diagnosisList.length,
    labAbnormalities,
    socialRiskFactors,
    tanzaniaPriorityConditions,
    neonatalRiskFactors: conditionFlags.neonatalRiskFactors,
    treatmentSignals: conditionFlags.onArt ? ['on_art'] : [],
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
