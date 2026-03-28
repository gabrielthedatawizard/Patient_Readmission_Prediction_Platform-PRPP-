const ROLE_FEATURES = {
  patientDirectory: new Set(['facility_manager', 'clinician', 'nurse']),
  patientDetail: new Set(['facility_manager', 'clinician', 'nurse']),
  patientRegistration: new Set(['clinician', 'hro']),
  encounterWrite: new Set(['clinician', 'nurse', 'hro']),
  taskWorkspace: new Set(['facility_manager', 'clinician', 'nurse', 'pharmacist', 'chw']),
  taskMutations: new Set(['facility_manager', 'clinician', 'nurse', 'pharmacist', 'chw']),
  predictionReview: new Set(['facility_manager', 'clinician', 'nurse']),
  predictionWorkflow: new Set(['clinician']),
  predictionOverride: new Set(['clinician']),
  communityVisits: new Set(['chw']),
  notifications: new Set(['facility_manager', 'clinician', 'nurse', 'pharmacist', 'chw'])
};

const FULL_PATIENT_SUMMARY_ROLES = new Set(['facility_manager', 'clinician', 'nurse']);
const MEDICATION_PATIENT_SUMMARY_ROLES = new Set(['pharmacist']);
const COMMUNITY_PATIENT_SUMMARY_ROLES = new Set(['chw']);

function normalizeRole(roleOrUser) {
  if (!roleOrUser) {
    return null;
  }

  const rawRole =
    typeof roleOrUser === 'string'
      ? roleOrUser
      : roleOrUser.role || roleOrUser.role?.slug || null;

  return String(rawRole || '')
    .trim()
    .toLowerCase();
}

function canAccessRoleFeature(roleOrUser, feature) {
  const role = normalizeRole(roleOrUser);
  if (!role) {
    return false;
  }

  if (role === 'moh') {
    return true;
  }

  const allowedRoles = ROLE_FEATURES[feature];
  if (!allowedRoles) {
    return false;
  }

  return allowedRoles.has(role);
}

function getPatientSummaryView(roleOrUser) {
  const role = normalizeRole(roleOrUser);

  if (FULL_PATIENT_SUMMARY_ROLES.has(role)) {
    return 'full';
  }

  if (MEDICATION_PATIENT_SUMMARY_ROLES.has(role)) {
    return 'medication';
  }

  if (COMMUNITY_PATIENT_SUMMARY_ROLES.has(role)) {
    return 'community';
  }

  return 'none';
}

function getFirstName(name) {
  const normalized = String(name || '').trim();
  if (!normalized) {
    return 'Patient';
  }

  return normalized.split(/\s+/)[0];
}

function buildTaskPatientSummary(roleOrUser, patient, { latestPrediction } = {}) {
  if (!patient) {
    return null;
  }

  const role = normalizeRole(roleOrUser);
  const view = getPatientSummaryView(role);
  const riskTier = latestPrediction?.tier || null;

  if (view === 'full') {
    return {
      ...patient,
      riskTier
    };
  }

  if (view === 'medication') {
    return {
      id: patient.id,
      name: patient.name,
      age: patient.age,
      gender: patient.gender,
      facilityId: patient.facilityId,
      status: patient.status,
      insurance: patient.insurance || null,
      riskTier,
      medicationScope: true
    };
  }

  if (view === 'community') {
    return {
      id: patient.id,
      name: getFirstName(patient.name),
      facilityId: patient.facilityId,
      status: patient.status,
      riskTier,
      communityScope: true
    };
  }

  return null;
}

module.exports = {
  ROLE_FEATURES,
  buildTaskPatientSummary,
  canAccessRoleFeature,
  normalizeRole
};
