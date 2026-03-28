const ROLE_TO_UI = {
  facility_manager: "facility-manager",
  ml_engineer: "ml-engineer",
};

const FEATURE_ROLES = {
  patientDirectory: new Set(["facility-manager", "clinician", "nurse"]),
  patientDetail: new Set(["facility-manager", "clinician", "nurse"]),
  dischargeWorkflow: new Set(["clinician"]),
  taskWorkspace: new Set(["facility-manager", "clinician", "nurse", "pharmacist", "chw"]),
  analyticsWorkspace: new Set(["moh", "rhmt", "chmt", "facility-manager", "ml-engineer"]),
  notifications: new Set(["facility-manager", "clinician", "nurse", "pharmacist", "chw"]),
};

export function normalizeAccessRole(role) {
  if (!role) {
    return null;
  }

  const normalized = String(role).trim().toLowerCase();
  return ROLE_TO_UI[normalized] || normalized;
}

export function canAccessWorkspaceFeature(role, feature) {
  const normalizedRole = normalizeAccessRole(role);
  if (!normalizedRole) {
    return false;
  }

  if (normalizedRole === "moh") {
    return true;
  }

  const allowedRoles = FEATURE_ROLES[feature];
  if (!allowedRoles) {
    return false;
  }

  return allowedRoles.has(normalizedRole);
}

export function shouldHydratePatientWorkspace(role) {
  return canAccessWorkspaceFeature(role, "patientDirectory");
}

export function shouldHydrateTaskWorkspace(role) {
  return canAccessWorkspaceFeature(role, "taskWorkspace");
}

export function canNavigateFromTaskToPatient(role) {
  return canAccessWorkspaceFeature(role, "patientDetail");
}

export function canStartDischarge(role) {
  return canAccessWorkspaceFeature(role, "dischargeWorkflow");
}

export function canOverridePrediction(role) {
  return normalizeAccessRole(role) === "clinician";
}

export function canReceiveOperationalNotifications(role) {
  return canAccessWorkspaceFeature(role, "notifications");
}

export function getPatientQueryFiltersForRole(role) {
  const normalizedRole = normalizeAccessRole(role);

  if (!shouldHydratePatientWorkspace(normalizedRole)) {
    return {};
  }

  if (normalizedRole === "clinician" || normalizedRole === "nurse") {
    return {
      assignedTo: "self",
    };
  }

  return {};
}

export function getTaskQueryFiltersForRole(role) {
  const normalizedRole = normalizeAccessRole(role);

  if (!shouldHydrateTaskWorkspace(normalizedRole)) {
    return {};
  }

  const filters = { include: "patient" };

  if (
    normalizedRole === "clinician" ||
    normalizedRole === "nurse" ||
    normalizedRole === "pharmacist" ||
    normalizedRole === "chw"
  ) {
    filters.assignedTo = "self";
  }

  return filters;
}

export function getAllowedWorkspaceNavIds(role) {
  const normalizedRole = normalizeAccessRole(role);

  const navIds = ["/dashboard"];

  if (canAccessWorkspaceFeature(normalizedRole, "patientDirectory")) {
    navIds.push("/patients");
  }

  if (canAccessWorkspaceFeature(normalizedRole, "taskWorkspace")) {
    navIds.push("/tasks");
  }

  if (canAccessWorkspaceFeature(normalizedRole, "analyticsWorkspace")) {
    navIds.push("/analytics");
  }

  navIds.push("/settings");
  return navIds;
}
