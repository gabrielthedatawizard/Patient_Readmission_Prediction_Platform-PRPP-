const { randomUUID } = require('crypto');
const { prisma, getDatabaseSchemaCapabilities } = require('../lib/prisma');

const DEMO_PASSWORD = 'Trip@2026';

function toDateIso(value) {
  if (!value) {
    return null;
  }

  return value instanceof Date ? value.toISOString() : value;
}

function mapStatusFromDb(status) {
  if (status === 'in_progress') {
    return 'in-progress';
  }

  return status;
}

function mapStatusToDb(status) {
  if (!status) {
    return undefined;
  }

  if (status === 'in-progress') {
    return 'in_progress';
  }

  return status;
}

function normalizeRole(role) {
  return String(role || '')
    .trim()
    .toLowerCase();
}

function toPublicUser(user) {
  if (!user) {
    return null;
  }

  const role = typeof user.role === 'string' ? user.role : user.role?.slug;
  const regionCode = user.regionCode || user.region?.code || null;

  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    role,
    facilityId: user.facilityId || null,
    regionCode,
    district: user.district || null,
    ward: user.ward || null,
    mfaEnabled: Boolean(user.mfaEnabled)
  };
}

function mapFacility(facility) {
  if (!facility) {
    return null;
  }

  return {
    id: facility.id,
    name: facility.name,
    regionCode: facility.regionCode || facility.region?.code || null,
    region: facility.region?.name || null,
    district: facility.district,
    level: facility.level,
    dhis2OrgUnitId: facility.dhis2OrgUnitId || null,
    dhis2Code: facility.dhis2Code || null
  };
}

const REGION_SELECT = {
  code: true,
  name: true
};

function buildUserSelect(capabilities = {}) {
  return {
    id: true,
    email: true,
    passwordHash: true,
    fullName: true,
    facilityId: true,
    mfaEnabled: true,
    role: {
      select: {
        slug: true
      }
    },
    region: {
      select: REGION_SELECT
    },
    ...(capabilities.userScopeAssignments
      ? {
          district: true,
          ward: true
        }
      : {})
  };
}

function isSchemaMismatchError(error) {
  return error?.code === 'P2021' || error?.code === 'P2022';
}

function buildFacilitySelect(capabilities = {}) {
  return {
    id: true,
    name: true,
    district: true,
    level: true,
    region: {
      select: REGION_SELECT
    },
    ...(capabilities.facilityDhis2Fields
      ? {
          dhis2OrgUnitId: true,
          dhis2Code: true
        }
      : {})
  };
}

function normalizeText(value) {
  return String(value || '')
    .trim()
    .toLowerCase();
}

function getAssignedDistrict(user) {
  const district = String(user?.district || '').trim();
  return district || null;
}

function getAssignedWard(user) {
  const role = normalizeRole(user?.role);
  if (role !== 'clinician' && role !== 'nurse') {
    return null;
  }

  const ward = String(user?.ward || '').trim();
  return ward || null;
}

function buildWardScopedPatientConstraint(user, accessibleFacilityIds = []) {
  const ward = getAssignedWard(user);
  if (!ward) {
    return null;
  }

  const visitScope =
    accessibleFacilityIds.length > 0
      ? {
          facilityId: {
            in: accessibleFacilityIds
          }
        }
      : user?.facilityId
        ? {
            facilityId: String(user.facilityId)
          }
        : {};

  return {
    OR: [
      {
        visits: {
          none: {}
        }
      },
      {
        visits: {
          some: {
            ...visitScope,
            ward,
            dischargeDate: null
          }
        }
      },
      {
        AND: [
          {
            visits: {
              none: {
                dischargeDate: null
              }
            }
          },
          {
            visits: {
              some: {
                ...visitScope,
                ward
              }
            }
          }
        ]
      }
    ]
  };
}

async function patientMatchesAssignedWard(user, patient) {
  const wardConstraint = buildWardScopedPatientConstraint(
    user,
    patient?.facilityId ? [String(patient.facilityId)] : []
  );

  if (!wardConstraint || !patient?.id) {
    return true;
  }

  const match = await prisma.patient.findFirst({
    where: {
      id: patient.id,
      facilityId: patient.facilityId,
      AND: [wardConstraint]
    },
    select: {
      id: true
    }
  });

  return Boolean(match);
}

async function canAccessPatientId(user, patientId, facilityId = null) {
  if (!patientId) {
    return false;
  }

  const patient = facilityId
    ? {
        id: patientId,
        facilityId
      }
    : await getPatientById(patientId);

  if (!patient) {
    return false;
  }

  if (!(await canAccessFacility(user, patient.facilityId))) {
    return false;
  }

  return patientMatchesAssignedWard(user, patient);
}

function canAccessVisitWard(user, visit) {
  const assignedWard = getAssignedWard(user);
  if (!assignedWard) {
    return true;
  }

  return String(visit?.ward || '').trim() === assignedWard;
}

function buildFacilitySyncIndex(facilities = [], capabilities = {}) {
  const byName = new Map();
  const byDhis2OrgUnitId = new Map();
  const byDhis2Code = new Map();

  facilities.forEach((facility) => {
    const normalizedName = normalizeText(facility.name);
    if (normalizedName && !byName.has(normalizedName)) {
      byName.set(normalizedName, facility);
    }

    if (capabilities.facilityDhis2Fields) {
      const orgUnitId = String(facility.dhis2OrgUnitId || '').trim();
      const dhis2Code = String(facility.dhis2Code || '').trim();

      if (orgUnitId && !byDhis2OrgUnitId.has(orgUnitId)) {
        byDhis2OrgUnitId.set(orgUnitId, facility);
      }

      if (dhis2Code && !byDhis2Code.has(dhis2Code)) {
        byDhis2Code.set(dhis2Code, facility);
      }
    }
  });

  return {
    byName,
    byDhis2OrgUnitId,
    byDhis2Code
  };
}

function addFacilityToSyncIndex(index, facility, capabilities = {}) {
  const normalizedName = normalizeText(facility.name);
  if (normalizedName && !index.byName.has(normalizedName)) {
    index.byName.set(normalizedName, facility);
  }

  if (!capabilities.facilityDhis2Fields) {
    return;
  }

  const orgUnitId = String(facility.dhis2OrgUnitId || '').trim();
  const dhis2Code = String(facility.dhis2Code || '').trim();

  if (orgUnitId && !index.byDhis2OrgUnitId.has(orgUnitId)) {
    index.byDhis2OrgUnitId.set(orgUnitId, facility);
  }

  if (dhis2Code && !index.byDhis2Code.has(dhis2Code)) {
    index.byDhis2Code.set(dhis2Code, facility);
  }
}

function findExistingFacilityForSync(entry, index, capabilities = {}) {
  if (capabilities.facilityDhis2Fields && entry.dhis2OrgUnitId) {
    const exact = index.byDhis2OrgUnitId.get(String(entry.dhis2OrgUnitId).trim());
    if (exact) {
      return { facility: exact, matchType: 'dhis2OrgUnitId' };
    }
  }

  if (capabilities.facilityDhis2Fields && entry.dhis2Code) {
    const exact = index.byDhis2Code.get(String(entry.dhis2Code).trim());
    if (exact) {
      return { facility: exact, matchType: 'dhis2Code' };
    }
  }

  if (entry.name) {
    const exact = index.byName.get(normalizeText(entry.name));
    if (exact) {
      return { facility: exact, matchType: 'name' };
    }
  }

  return { facility: null, matchType: null };
}

function buildVisitSelect(capabilities = {}) {
  return {
    id: true,
    patientId: true,
    facilityId: true,
    admissionDate: true,
    dischargeDate: true,
    diagnosis: true,
    ward: true,
    lengthOfStay: true,
    createdAt: true,
    updatedAt: true,
    ...(capabilities.visitStructuredFields
      ? {
          diagnoses: true,
          medications: true,
          labResults: true,
          vitalSigns: true,
          socialFactors: true,
          dischargeDisposition: true
        }
      : {})
  };
}

function sanitizeVisitWrite(data = {}, capabilities = {}) {
  if (capabilities.visitStructuredFields) {
    return data;
  }

  const next = { ...data };
  delete next.diagnoses;
  delete next.medications;
  delete next.labResults;
  delete next.vitalSigns;
  delete next.socialFactors;
  delete next.dischargeDisposition;
  return next;
}

function buildPredictionSelect(capabilities = {}) {
  return {
    id: true,
    patientId: true,
    visitId: true,
    facilityId: true,
    score: true,
    tier: true,
    factors: true,
    explanation: true,
    confidence: true,
    confidenceLow: true,
    confidenceHigh: true,
    modelVersion: true,
    modelType: true,
    fallbackUsed: true,
    dataQuality: true,
    generatedById: true,
    overrideTier: true,
    overrideReason: true,
    overriddenAt: true,
    generatedAt: true,
    ...(capabilities.predictionMlFields
      ? {
          probability: true,
          method: true,
          featureSnapshot: true,
          analysisSummary: true
        }
      : {})
  };
}

function sanitizePredictionWrite(data = {}, capabilities = {}) {
  if (capabilities.predictionMlFields) {
    return data;
  }

  const next = { ...data };
  delete next.probability;
  delete next.method;
  delete next.featureSnapshot;
  delete next.analysisSummary;
  return next;
}

function createCompatibilityAlert(entry = {}) {
  const timestamp = toDateIso(new Date());

  return {
    id: entry.id || `compat-alert-${randomUUID()}`,
    patientId: entry.patientId,
    predictionId: entry.predictionId || null,
    facilityId: entry.facilityId,
    score: Number(entry.score || 0),
    tier: entry.tier || 'High',
    threshold: Number(entry.threshold || 80),
    severity: entry.severity || 'high',
    message: entry.message || null,
    channels: Array.isArray(entry.channels) ? entry.channels : [],
    status: entry.status || 'open',
    acknowledgedAt: null,
    acknowledgedById: null,
    resolvedAt: null,
    resolvedById: null,
    resolutionNote: null,
    createdAt: timestamp,
    updatedAt: timestamp
  };
}

function mapPrediction(prediction) {
  if (!prediction) {
    return null;
  }

  return {
    id: prediction.id,
    patientId: prediction.patientId,
    visitId: prediction.visitId || null,
    facilityId: prediction.facilityId,
    score: prediction.score,
    probability:
      prediction.probability !== null && prediction.probability !== undefined
        ? prediction.probability
        : Number((Number(prediction.score || 0) / 100).toFixed(3)),
    tier: prediction.tier,
    confidence: prediction.confidence,
    confidenceInterval: {
      low: prediction.confidenceLow,
      high: prediction.confidenceHigh
    },
    modelVersion: prediction.modelVersion,
    modelType: prediction.modelType,
    method: prediction.method || (prediction.fallbackUsed ? 'rules' : 'ml'),
    fallbackUsed: prediction.fallbackUsed,
    factors: prediction.factors || [],
    explanation: prediction.explanation,
    dataQuality: prediction.dataQuality || null,
    featureSnapshot: prediction.featureSnapshot || null,
    analysisSummary: prediction.analysisSummary || null,
    createdBy: prediction.generatedById || null,
    generatedAt: toDateIso(prediction.generatedAt),
    override:
      prediction.overrideTier && prediction.overrideReason
        ? {
            overriddenBy: prediction.generatedById || null,
            previousTier: prediction.tier,
            newTier: prediction.overrideTier,
            reason: prediction.overrideReason,
            overriddenAt: toDateIso(prediction.overriddenAt)
          }
        : null
  };
}

function mapVisit(visit) {
  if (!visit) {
    return null;
  }

  return {
    id: visit.id,
    patientId: visit.patientId,
    facilityId: visit.facilityId,
    admissionDate: toDateIso(visit.admissionDate),
    dischargeDate: toDateIso(visit.dischargeDate),
    diagnosis: visit.diagnosis,
    diagnoses: visit.diagnoses || [],
    medications: visit.medications || [],
    labResults: visit.labResults || null,
    vitalSigns: visit.vitalSigns || null,
    socialFactors: visit.socialFactors || null,
    dischargeDisposition: visit.dischargeDisposition || null,
    ward: visit.ward,
    lengthOfStay: visit.lengthOfStay,
    createdAt: toDateIso(visit.createdAt),
    updatedAt: toDateIso(visit.updatedAt)
  };
}

function mapTask(task) {
  if (!task) {
    return null;
  }

  return {
    id: task.id,
    patientId: task.patientId,
    predictionId: task.predictionId,
    facilityId: task.facilityId,
    title: task.title,
    category: task.category,
    priority: task.priority,
    status: mapStatusFromDb(task.status),
    dueDate: toDateIso(task.dueDate),
    assignee: task.assignee,
    createdBy: task.updatedById,
    completedAt: toDateIso(task.completedAt),
    createdAt: toDateIso(task.createdAt),
    updatedAt: toDateIso(task.updatedAt)
  };
}

function mapAlert(alert) {
  if (!alert) {
    return null;
  }

  return {
    id: alert.id,
    patientId: alert.patientId,
    predictionId: alert.predictionId || null,
    facilityId: alert.facilityId,
    score: alert.score,
    tier: alert.tier,
    threshold: alert.threshold,
    severity: alert.severity,
    message: alert.message || null,
    channels: alert.channels || [],
    status: alert.status,
    acknowledgedAt: toDateIso(alert.acknowledgedAt),
    acknowledgedById: alert.acknowledgedById || null,
    resolvedAt: toDateIso(alert.resolvedAt),
    resolvedById: alert.resolvedById || null,
    resolutionNote: alert.resolutionNote || null,
    createdAt: toDateIso(alert.createdAt),
    updatedAt: toDateIso(alert.updatedAt)
  };
}

function mapPatient(patient) {
  if (!patient) {
    return null;
  }

  return {
    id: patient.id,
    name: patient.name,
    age: patient.age,
    gender: patient.gender,
    phone: patient.phone,
    address: patient.address,
    insurance: patient.insurance,
    facilityId: patient.facilityId,
    status: patient.status,
    clinicalProfile: patient.clinicalProfile || { age: patient.age },
    createdAt: toDateIso(patient.createdAt),
    updatedAt: toDateIso(patient.updatedAt)
  };
}

function matchesPatientSearch(patient, rawQuery) {
  const query = String(rawQuery || '')
    .trim()
    .toLowerCase();

  if (!query) {
    return true;
  }

  return (
    String(patient.id || '').toLowerCase().includes(query) ||
    String(patient.name || '').toLowerCase().includes(query)
  );
}

async function resolveAccessibleFacilityIds(user) {
  if (!user) {
    return [];
  }

  const role = normalizeRole(user.role);
  if (role === 'moh' || role === 'ml_engineer') {
    const facilities = await prisma.facility.findMany({
      select: { id: true }
    });

    return facilities.map((facility) => facility.id);
  }

  if (role === 'rhmt' || role === 'chmt') {
    const where = {
      region: {
        code: user.regionCode
      }
    };
    const district = getAssignedDistrict(user);
    if (role === 'chmt' && district) {
      where.district = district;
    }

    const facilities = await prisma.facility.findMany({
      where,
      select: { id: true }
    });

    return facilities.map((facility) => facility.id);
  }

  return user.facilityId ? [user.facilityId] : [];
}

async function getFacilityById(facilityId) {
  const capabilities = await getDatabaseSchemaCapabilities();
  const facility = await prisma.facility.findUnique({
    where: { id: facilityId },
    select: buildFacilitySelect(capabilities)
  });

  return mapFacility(facility);
}

async function listFacilities() {
  const capabilities = await getDatabaseSchemaCapabilities();
  const facilities = await prisma.facility.findMany({
    select: buildFacilitySelect(capabilities),
    orderBy: {
      name: 'asc'
    }
  });

  return facilities.map((facility) => mapFacility(facility));
}

function chunkItems(items = [], size = 100) {
  const chunks = [];

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }

  return chunks;
}

function buildFacilitySyncPreview(entry, source = null) {
  return mapFacility({
    id: source?.id || entry.id,
    name: entry.name,
    level: entry.level,
    district: entry.district,
    dhis2OrgUnitId: entry.dhis2OrgUnitId || null,
    dhis2Code: entry.dhis2Code || null,
    region: {
      code: entry.regionCode,
      name: entry.regionName || entry.regionCode
    }
  });
}

async function upsertFacilitiesFromSync(entries = [], options = {}) {
  const dryRun = options.dryRun === true;
  const responseSampleLimit = Number.isFinite(Number(options.responseSampleLimit))
    ? Math.max(10, Math.min(Number(options.responseSampleLimit), 250))
    : 100;
  const capabilities = await getDatabaseSchemaCapabilities();
  const facilitySelect = buildFacilitySelect(capabilities);
  const existingFacilities = await prisma.facility.findMany({
    select: facilitySelect
  });
  const facilityIndex = buildFacilitySyncIndex(existingFacilities, capabilities);
  const plannedEntries = entries.map((entry) => {
    const match = findExistingFacilityForSync(entry, facilityIndex, capabilities);
    return {
      entry,
      existing: match.facility,
      matchType: match.matchType
    };
  });
  const syncedFacilities = [];
  let imported = 0;
  let updated = 0;
  let matchedByName = 0;

  for (const { entry, existing, matchType } of plannedEntries) {
    if (existing) {
      updated += 1;
      if (matchType === 'name') {
        matchedByName += 1;
      }

      if (dryRun) {
        syncedFacilities.push(buildFacilitySyncPreview(entry, existing));
      }
      continue;
    }

    imported += 1;
    if (dryRun) {
      syncedFacilities.push(buildFacilitySyncPreview(entry));
    }
  }

  if (dryRun) {
    return {
      total: entries.length,
      imported,
      updated,
      matchedByName,
      facilities: syncedFacilities.slice(0, responseSampleLimit),
      facilitiesTruncated: syncedFacilities.length > responseSampleLimit
    };
  }

  const uniqueRegions = Array.from(
    plannedEntries.reduce((bucket, { entry }) => {
      const code = String(entry.regionCode || '').trim();
      if (!code) {
        return bucket;
      }

      if (!bucket.has(code)) {
        bucket.set(code, {
          code,
          name: entry.regionName || code
        });
      }

      return bucket;
    }, new Map()).values()
  );
  const regions = await Promise.all(
    uniqueRegions.map((regionEntry) =>
      prisma.region.upsert({
        where: { code: regionEntry.code },
        update: { name: regionEntry.name || regionEntry.code },
        create: {
          code: regionEntry.code,
          name: regionEntry.name || regionEntry.code
        }
      })
    )
  );
  const regionsByCode = new Map(regions.map((region) => [region.code, region]));

  const updateOperations = [];
  const createOperations = [];

  plannedEntries.forEach(({ entry, existing }) => {
    const region = regionsByCode.get(entry.regionCode);
    const facilityData = {
      name: entry.name,
      level: entry.level,
      district: entry.district,
      ...(capabilities.facilityDhis2Fields
        ? {
            dhis2OrgUnitId: entry.dhis2OrgUnitId || null,
            dhis2Code: entry.dhis2Code || null
          }
        : {}),
      regionId: region?.id || existing?.regionId || null
    };

    if (existing) {
      updateOperations.push({
        id: existing.id,
        data: facilityData
      });
    } else {
      createOperations.push({
        id: entry.id,
        data: {
          id: entry.id,
          ...facilityData
        }
      });
    }
  });

  const syncedFacilityMap = new Map();

  for (const chunk of chunkItems(updateOperations, 50)) {
    const savedFacilities = await prisma.$transaction(
      chunk.map((operation) =>
        prisma.facility.update({
          where: { id: operation.id },
          data: operation.data,
          select: facilitySelect
        })
      )
    );

    savedFacilities.forEach((facility) => {
      addFacilityToSyncIndex(facilityIndex, facility, capabilities);
      syncedFacilityMap.set(facility.id, mapFacility(facility));
    });
  }

  for (const chunk of chunkItems(createOperations, 200)) {
    await prisma.facility.createMany({
      data: chunk.map((operation) => operation.data),
      skipDuplicates: true
    });

    const createdFacilities = await prisma.facility.findMany({
      where: {
        id: {
          in: chunk.map((operation) => operation.id)
        }
      },
      select: facilitySelect
    });

    createdFacilities.forEach((facility) => {
      addFacilityToSyncIndex(facilityIndex, facility, capabilities);
      syncedFacilityMap.set(facility.id, mapFacility(facility));
    });
  }

  return {
    total: entries.length,
    imported,
    updated,
    matchedByName,
    facilities: Array.from(syncedFacilityMap.values()).slice(0, responseSampleLimit),
    facilitiesTruncated: syncedFacilityMap.size > responseSampleLimit
  };
}

async function getUserByEmail(email) {
  if (!email) {
    return null;
  }

  const capabilities = await getDatabaseSchemaCapabilities();
  return prisma.user.findUnique({
    where: {
      email: String(email).toLowerCase()
    },
    select: buildUserSelect(capabilities)
  });
}

async function getUserById(id) {
  if (!id) {
    return null;
  }

  const capabilities = await getDatabaseSchemaCapabilities();
  return prisma.user.findUnique({
    where: { id },
    select: buildUserSelect(capabilities)
  });
}

async function canAccessFacility(user, facilityId) {
  const accessibleFacilityIds = await resolveAccessibleFacilityIds(user);
  return accessibleFacilityIds.includes(facilityId);
}

async function canAccessPatient(user, patient) {
  if (!patient) {
    return false;
  }

  if (!(await canAccessFacility(user, patient.facilityId))) {
    return false;
  }

  return patientMatchesAssignedWard(user, patient);
}

async function listPatientsForUser(user, filters = {}) {
  const accessibleFacilityIds = await resolveAccessibleFacilityIds(user);

  if (accessibleFacilityIds.length === 0) {
    return [];
  }

  const where = {
    facilityId: {
      in: accessibleFacilityIds
    }
  };
  const wardConstraint = buildWardScopedPatientConstraint(user, accessibleFacilityIds);
  if (wardConstraint) {
    where.AND = [wardConstraint];
  }

  if (filters.facilityId) {
    if (!accessibleFacilityIds.includes(filters.facilityId)) {
      return [];
    }

    where.facilityId = filters.facilityId;
  }

  if (filters.status) {
    where.status = filters.status;
  }

  const patients = await prisma.patient.findMany({
    where,
    orderBy: {
      updatedAt: 'desc'
    }
  });

  const mappedPatients = patients.map(mapPatient);

  if (!filters.search) {
    return mappedPatients;
  }

  return mappedPatients.filter((patient) => matchesPatientSearch(patient, filters.search));
}

async function getPatientById(patientId) {
  if (!patientId) {
    return null;
  }

  const patient = await prisma.patient.findUnique({
    where: {
      id: patientId
    }
  });

  return mapPatient(patient);
}

async function getPatientForUser(user, patientId) {
  const patient = await getPatientById(patientId);

  if (!patient) {
    return null;
  }

  if (!(await canAccessPatient(user, patient))) {
    return null;
  }

  return patient;
}

async function getVisitById(visitId) {
  if (!visitId) {
    return null;
  }

  const capabilities = await getDatabaseSchemaCapabilities();
  const visit = await prisma.visit.findUnique({
    where: {
      id: visitId
    },
    select: buildVisitSelect(capabilities)
  });

  return mapVisit(visit);
}

async function getVisitForUser(user, visitId) {
  const visit = await getVisitById(visitId);

  if (!visit) {
    return null;
  }

  if (!(await canAccessFacility(user, visit.facilityId))) {
    return null;
  }

  if (!canAccessVisitWard(user, visit)) {
    return null;
  }

  return visit;
}

async function listVisitsForPatient(user, patientId) {
  const patient = await getPatientForUser(user, patientId);

  if (!patient) {
    return [];
  }

  const capabilities = await getDatabaseSchemaCapabilities();
  const visits = await prisma.visit.findMany({
    where: {
      patientId
    },
    select: buildVisitSelect(capabilities),
    orderBy: {
      admissionDate: 'desc'
    }
  });

  return visits
    .map(mapVisit)
    .filter((visit) => canAccessVisitWard(user, visit));
}

async function createPatientForUser(user, payload) {
  const facilityId = payload.facilityId || user.facilityId;

  if (!facilityId || !(await canAccessFacility(user, facilityId))) {
    throw new Error('You do not have access to create a patient in this facility.');
  }

  const patient = await prisma.patient.create({
    data: {
      id: payload.id,
      name: payload.name,
      age: Number(payload.age),
      gender: String(payload.gender || '').toLowerCase(),
      phone: payload.phone || null,
      address: payload.address || null,
      insurance: payload.insurance || null,
      status: payload.status || 'admitted',
      clinicalProfile: payload.clinicalProfile || { age: Number(payload.age) },
      facilityId
    }
  });

  return mapPatient(patient);
}

async function updatePatientForUser(user, patientId, payload) {
  const current = await getPatientForUser(user, patientId);

  if (!current) {
    return null;
  }

  if (
    payload.facilityId &&
    payload.facilityId !== current.facilityId &&
    !(await canAccessFacility(user, payload.facilityId))
  ) {
    throw new Error('You do not have access to move this patient to the requested facility.');
  }

  const updated = await prisma.patient.update({
    where: {
      id: patientId
    },
    data: {
      name: payload.name,
      age: payload.age,
      gender: payload.gender ? String(payload.gender).toLowerCase() : undefined,
      phone: payload.phone,
      address: payload.address,
      insurance: payload.insurance,
      status: payload.status,
      clinicalProfile:
        payload.clinicalProfile && typeof payload.clinicalProfile === 'object'
          ? {
              ...(current.clinicalProfile || {}),
              ...payload.clinicalProfile
            }
          : undefined,
      facilityId: payload.facilityId
    }
  });

  return mapPatient(updated);
}

async function createVisitForUser(user, patientId, payload = {}) {
  const patient = await getPatientForUser(user, patientId);

  if (!patient) {
    return null;
  }

  const facilityId = payload.facilityId || patient.facilityId;
  if (!(await canAccessFacility(user, facilityId))) {
    throw new Error('You do not have access to create an encounter in this facility.');
  }
  const assignedWard = getAssignedWard(user);
  const requestedWard = String(payload.ward || '').trim();
  if (assignedWard && requestedWard && requestedWard !== assignedWard) {
    throw new Error('You do not have access to record encounters outside your assigned ward.');
  }

  const capabilities = await getDatabaseSchemaCapabilities();
  const visit = await prisma.visit.create({
    data: sanitizeVisitWrite({
      id: payload.id || undefined,
      patientId,
      facilityId,
      admissionDate: new Date(payload.admissionDate),
      dischargeDate: payload.dischargeDate ? new Date(payload.dischargeDate) : null,
      diagnosis: payload.diagnosis,
      diagnoses: payload.diagnoses || [],
      medications: payload.medications || [],
      labResults: payload.labResults || null,
      vitalSigns: payload.vitalSigns || null,
      socialFactors: payload.socialFactors || null,
      dischargeDisposition: payload.dischargeDisposition || null,
      ward: requestedWard || assignedWard || 'General',
      lengthOfStay: payload.lengthOfStay ?? null
    }, capabilities),
    select: buildVisitSelect(capabilities)
  });

  return mapVisit(visit);
}

async function createPrediction(entry) {
  const capabilities = await getDatabaseSchemaCapabilities();
  const prediction = await prisma.prediction.create({
    data: sanitizePredictionWrite({
      patientId: entry.patientId,
      visitId: entry.visitId || null,
      facilityId: entry.facilityId,
      score: entry.score,
      probability: entry.probability ?? null,
      tier: entry.tier,
      factors: entry.factors || [],
      explanation: entry.explanation || null,
      confidence: entry.confidence,
      confidenceLow: entry.confidenceInterval?.low ?? 0,
      confidenceHigh: entry.confidenceInterval?.high ?? 100,
      modelVersion: entry.modelVersion,
      modelType: entry.modelType,
      method: entry.method || null,
      fallbackUsed: Boolean(entry.fallbackUsed),
      dataQuality: entry.dataQuality || null,
      featureSnapshot: entry.featureSnapshot || null,
      analysisSummary: entry.analysisSummary || null,
      generatedById: entry.createdBy || null
    }, capabilities),
    select: buildPredictionSelect(capabilities)
  });

  return mapPrediction(prediction);
}

async function getPredictionForUser(user, predictionId) {
  const capabilities = await getDatabaseSchemaCapabilities();
  const prediction = await prisma.prediction.findUnique({
    where: {
      id: predictionId
    },
    select: buildPredictionSelect(capabilities)
  });

  if (!prediction) {
    return null;
  }

  if (!(await canAccessPatientId(user, prediction.patientId, prediction.facilityId))) {
    return null;
  }

  return mapPrediction(prediction);
}

async function listPredictionsForPatient(user, patientId) {
  const patient = await getPatientForUser(user, patientId);

  if (!patient) {
    return [];
  }

  const capabilities = await getDatabaseSchemaCapabilities();
  const predictions = await prisma.prediction.findMany({
    where: {
      patientId
    },
    select: buildPredictionSelect(capabilities),
    orderBy: {
      generatedAt: 'desc'
    }
  });

  return predictions.map(mapPrediction);
}

async function updatePredictionOverrideForUser(user, predictionId, overridePayload) {
  const capabilities = await getDatabaseSchemaCapabilities();
  const current = await prisma.prediction.findUnique({
    where: {
      id: predictionId
    },
    select: buildPredictionSelect(capabilities)
  });

  if (!current) {
    return null;
  }

  if (!(await canAccessPatientId(user, current.patientId, current.facilityId))) {
    return null;
  }

  const updated = await prisma.prediction.update({
    where: {
      id: predictionId
    },
    data: {
      overrideTier: overridePayload.newTier,
      overrideReason: overridePayload.reason,
      overriddenAt: new Date(),
      tier: overridePayload.newTier
    },
    select: buildPredictionSelect(capabilities)
  });

  const mapped = mapPrediction(updated);
  mapped.override = {
    overriddenBy: user.id,
    previousTier: current.tier,
    newTier: overridePayload.newTier,
    reason: overridePayload.reason,
    overriddenAt: toDateIso(updated.overriddenAt)
  };

  return mapped;
}

async function createTasks(taskEntries) {
  const tasks = [];

  for (const entry of taskEntries) {
    const task = await prisma.task.create({
      data: {
        patientId: entry.patientId,
        predictionId: entry.predictionId || null,
        facilityId: entry.facilityId,
        title: entry.title,
        category: entry.category,
        priority: entry.priority,
        status: mapStatusToDb(entry.status || 'pending') || 'pending',
        assignee: entry.assignee || null,
        dueDate: new Date(entry.dueDate),
        updatedById: entry.createdBy || null
      }
    });

    tasks.push(mapTask(task));
  }

  return tasks;
}

async function listTasksForUser(user, filters = {}) {
  const accessibleFacilityIds = await resolveAccessibleFacilityIds(user);

  if (accessibleFacilityIds.length === 0) {
    return [];
  }

  const where = {
    facilityId: {
      in: accessibleFacilityIds
    }
  };

  if (filters.patientId) {
    where.patientId = filters.patientId;
  }

  if (filters.predictionId) {
    where.predictionId = String(filters.predictionId);
  }

  if (filters.priority) {
    where.priority = filters.priority;
  }

  if (filters.status) {
    where.status = mapStatusToDb(filters.status);
  }

  if (filters.assignee) {
    where.assignee = filters.assignee;
  }

  const tasks = await prisma.task.findMany({
    where,
    orderBy: {
      dueDate: 'asc'
    }
  });

  const mappedTasks = tasks.map(mapTask);
  if (!getAssignedWard(user)) {
    return mappedTasks;
  }

  const visibility = await Promise.all(
    mappedTasks.map(async (task) => ({
      task,
      allowed: await canAccessPatientId(user, task.patientId, task.facilityId)
    }))
  );

  return visibility.filter((entry) => entry.allowed).map((entry) => entry.task);
}

async function getTaskForUser(user, taskId) {
  if (!taskId) {
    return null;
  }

  const task = await prisma.task.findUnique({
    where: {
      id: taskId
    }
  });

  if (!task) {
    return null;
  }

  if (!(await canAccessPatientId(user, task.patientId, task.facilityId))) {
    return null;
  }

  return mapTask(task);
}

async function updateTaskForUser(user, taskId, patch) {
  const current = await prisma.task.findUnique({
    where: {
      id: taskId
    }
  });

  if (!current) {
    return null;
  }

  if (!(await canAccessPatientId(user, current.patientId, current.facilityId))) {
    return null;
  }

  const data = {};

  if (patch.status !== undefined) {
    data.status = mapStatusToDb(patch.status);

    if (patch.status === 'done') {
      data.completedAt = new Date();
    }
  }

  if (patch.assignee !== undefined) {
    data.assignee = patch.assignee;
  }

  if (patch.dueDate !== undefined) {
    data.dueDate = new Date(patch.dueDate);
  }

  if (user.id) {
    data.updatedById = user.id;
  }

  const task = await prisma.task.update({
    where: {
      id: taskId
    },
    data
  });

  return mapTask(task);
}

async function createRiskAlert(entry) {
  const capabilities = await getDatabaseSchemaCapabilities();
  if (!capabilities.hasAlertTable) {
    return createCompatibilityAlert(entry);
  }

  try {
    if (entry.predictionId) {
      const existing = await prisma.alert.findUnique({
        where: {
          predictionId: entry.predictionId
        }
      });

      if (existing) {
        return mapAlert(existing);
      }
    }

    const created = await prisma.alert.create({
      data: {
        patientId: entry.patientId,
        predictionId: entry.predictionId || null,
        facilityId: entry.facilityId,
        score: Number(entry.score || 0),
        tier: entry.tier || 'High',
        threshold: Number(entry.threshold || 80),
        severity: entry.severity || 'high',
        message: entry.message || null,
        channels: Array.isArray(entry.channels) ? entry.channels : [],
        status: entry.status || 'open'
      }
    });

    return mapAlert(created);
  } catch (error) {
    if (isSchemaMismatchError(error)) {
      return createCompatibilityAlert(entry);
    }

    throw error;
  }
}

async function listAlertsForUser(user, filters = {}) {
  const capabilities = await getDatabaseSchemaCapabilities();
  if (!capabilities.hasAlertTable) {
    return [];
  }

  const accessibleFacilityIds = await resolveAccessibleFacilityIds(user);
  if (!accessibleFacilityIds.length) {
    return [];
  }

  const where = {
    facilityId: {
      in: accessibleFacilityIds
    }
  };

  if (filters.patientId) {
    where.patientId = String(filters.patientId);
  }

  if (filters.predictionId) {
    where.predictionId = String(filters.predictionId);
  }

  if (filters.status) {
    where.status = String(filters.status);
  }

  if (filters.facilityId) {
    const requestedFacilityId = String(filters.facilityId);
    if (!accessibleFacilityIds.includes(requestedFacilityId)) {
      return [];
    }
    where.facilityId = requestedFacilityId;
  }

  const take = Math.min(Math.max(Number(filters.limit) || 100, 1), 500);
  const skip = Math.max(Number(filters.offset) || 0, 0);

  try {
    const alerts = await prisma.alert.findMany({
      where,
      orderBy: {
        createdAt: 'desc'
      },
      skip,
      take
    });

    const mappedAlerts = alerts.map(mapAlert);
    if (!getAssignedWard(user)) {
      return mappedAlerts;
    }

    const visibility = await Promise.all(
      mappedAlerts.map(async (alert) => ({
        alert,
        allowed: await canAccessPatientId(user, alert.patientId, alert.facilityId)
      }))
    );

    return visibility.filter((entry) => entry.allowed).map((entry) => entry.alert);
  } catch (error) {
    if (isSchemaMismatchError(error)) {
      return [];
    }

    throw error;
  }
}

async function getAlertForUser(user, alertId) {
  if (!alertId) {
    return null;
  }

  const capabilities = await getDatabaseSchemaCapabilities();
  if (!capabilities.hasAlertTable) {
    return null;
  }

  let alert;
  try {
    alert = await prisma.alert.findUnique({
      where: {
        id: alertId
      }
    });
  } catch (error) {
    if (isSchemaMismatchError(error)) {
      return null;
    }

    throw error;
  }

  if (!alert) {
    return null;
  }

  if (!(await canAccessPatientId(user, alert.patientId, alert.facilityId))) {
    return null;
  }

  return mapAlert(alert);
}

async function updateAlertForUser(user, alertId, patch = {}) {
  const capabilities = await getDatabaseSchemaCapabilities();
  if (!capabilities.hasAlertTable) {
    return null;
  }

  let current;
  try {
    current = await prisma.alert.findUnique({
      where: {
        id: alertId
      }
    });
  } catch (error) {
    if (isSchemaMismatchError(error)) {
      return null;
    }

    throw error;
  }

  if (!current) {
    return null;
  }

  if (!(await canAccessPatientId(user, current.patientId, current.facilityId))) {
    return null;
  }

  const data = {};

  if (patch.status !== undefined) {
    data.status = patch.status;
  }

  if (patch.acknowledgedAt !== undefined) {
    data.acknowledgedAt = patch.acknowledgedAt ? new Date(patch.acknowledgedAt) : null;
  }

  if (patch.acknowledgedById !== undefined) {
    data.acknowledgedById = patch.acknowledgedById || null;
  }

  if (patch.resolvedAt !== undefined) {
    data.resolvedAt = patch.resolvedAt ? new Date(patch.resolvedAt) : null;
  }

  if (patch.resolvedById !== undefined) {
    data.resolvedById = patch.resolvedById || null;
  }

  if (patch.resolutionNote !== undefined) {
    data.resolutionNote = patch.resolutionNote || null;
  }

  let updated;
  try {
    updated = await prisma.alert.update({
      where: {
        id: alertId
      },
      data
    });
  } catch (error) {
    if (isSchemaMismatchError(error)) {
      return null;
    }

    throw error;
  }

  return mapAlert(updated);
}

async function updateAlertChannels(alertId, channels = []) {
  if (!alertId) {
    return null;
  }

  const capabilities = await getDatabaseSchemaCapabilities();
  if (!capabilities.hasAlertTable) {
    return null;
  }

  let updated;
  try {
    updated = await prisma.alert.update({
      where: {
        id: alertId
      },
      data: {
        channels: Array.isArray(channels) ? channels : []
      }
    });
  } catch (error) {
    if (isSchemaMismatchError(error)) {
      return null;
    }

    throw error;
  }

  return mapAlert(updated);
}

async function createAuditLog(entry) {
  const created = await prisma.auditLog.create({
    data: {
      userId: entry.userId || null,
      facilityId: entry.facilityId || null,
      action: entry.action,
      resource: entry.resource || null,
      details: {
        ...(entry.details || {}),
        userRole: entry.userRole || null,
        regionCode: entry.regionCode || null
      },
      ipAddress: entry.ipAddress || null
    }
  });

  return {
    id: created.id,
    userId: created.userId,
    userRole: created.details?.userRole || null,
    action: created.action,
    resource: created.resource,
    details: created.details,
    ipAddress: created.ipAddress,
    facilityId: created.facilityId,
    regionCode: created.details?.regionCode || null,
    createdAt: toDateIso(created.createdAt)
  };
}

async function listAuditLogsForUser(user, options = {}) {
  const limit = Math.min(Number(options.limit) || 100, 500);
  const offset = Math.max(Number(options.offset) || 0, 0);

  const where = {};

  if (user.role === 'rhmt' || user.role === 'chmt') {
    const facilityIds = await resolveAccessibleFacilityIds(user);
    where.facilityId = {
      in: facilityIds
    };
  } else if (user.role !== 'moh' && user.role !== 'ml_engineer') {
    where.facilityId = user.facilityId || '__none__';
  }

  const logs = await prisma.auditLog.findMany({
    where,
    orderBy: {
      createdAt: 'desc'
    },
    skip: offset,
    take: limit
  });

  return logs.map((log) => ({
    id: log.id,
    userId: log.userId,
    userRole: log.details?.userRole || null,
    action: log.action,
    resource: log.resource,
    details: log.details,
    ipAddress: log.ipAddress,
    facilityId: log.facilityId,
    regionCode: log.details?.regionCode || null,
    createdAt: toDateIso(log.createdAt)
  }));
}

async function buildDataQualitySnapshot() {
  const patients = await prisma.patient.findMany({
    select: {
      phone: true,
      insurance: true,
      status: true
    }
  });

  const fields = ['phone', 'insurance', 'status'];
  let present = 0;
  let total = 0;

  patients.forEach((patient) => {
    fields.forEach((field) => {
      total += 1;

      if (patient[field] !== null && patient[field] !== undefined && patient[field] !== '') {
        present += 1;
      }
    });
  });

  const completeness = total === 0 ? 1 : present / total;

  return {
    generatedAt: new Date().toISOString(),
    patientCount: patients.length,
    criticalFieldCompleteness: Number(completeness.toFixed(3)),
    qualityStatus: completeness < 0.7 ? 'alert' : 'ok'
  };
}

async function buildFairnessSnapshot() {
  const capabilities = await getDatabaseSchemaCapabilities();
  const predictions = await prisma.prediction.findMany({
    select: {
      ...buildPredictionSelect(capabilities),
      patient: {
        select: {
          gender: true
        }
      }
    }
  });

  const totals = new Map();

  predictions.forEach((prediction) => {
    const groupKey = prediction.patient?.gender || 'unknown';

    if (!totals.has(groupKey)) {
      totals.set(groupKey, { count: 0, scoreSum: 0 });
    }

    const group = totals.get(groupKey);
    group.count += 1;
    group.scoreSum += prediction.score;
  });

  const groups = Array.from(totals.entries()).map(([group, stats]) => ({
    group,
    predictionCount: stats.count,
    meanScore: Number((stats.scoreSum / stats.count).toFixed(2))
  }));

  const means = groups.map((item) => item.meanScore);
  const variance = means.length >= 2 ? Math.max(...means) - Math.min(...means) : 0;

  return {
    generatedAt: new Date().toISOString(),
    dimension: 'gender',
    groups,
    variance,
    fairnessStatus: variance > 12 ? 'alert' : 'ok'
  };
}

async function appendSyncEvent(entry) {
  const created = await prisma.auditLog.create({
    data: {
      userId: entry.actorUserId || null,
      facilityId: entry.facilityId || null,
      action: 'sync_event',
      resource: `${entry.entityType}:${entry.entityId}`,
      details: {
        eventType: entry.eventType || 'mutation',
        operation: entry.operation,
        entityType: entry.entityType,
        entityId: entry.entityId,
        payload: entry.payload || {},
        actorUserId: entry.actorUserId || null
      },
      ipAddress: entry.ipAddress || null
    }
  });

  return {
    id: created.id,
    cursor: `${toDateIso(created.createdAt)}|${created.id}`,
    facilityId: created.facilityId,
    eventType: created.details?.eventType || 'mutation',
    operation: created.details?.operation || null,
    entityType: created.details?.entityType || null,
    entityId: created.details?.entityId || null,
    payload: created.details?.payload || {},
    actorUserId: created.details?.actorUserId || null,
    createdAt: toDateIso(created.createdAt)
  };
}

async function listSyncEventsForUser(user, options = {}) {
  const limit = Math.min(Math.max(Number(options.limit) || 50, 1), 500);
  const where = {
    action: 'sync_event'
  };

  if (options.since) {
    const sinceRaw = String(options.since).split('|')[0];
    const since = new Date(sinceRaw);
    if (!Number.isNaN(since.getTime())) {
      where.createdAt = {
        gt: since
      };
    }
  }

  if (options.facilityId) {
    const accessible = await resolveAccessibleFacilityIds(user);
    if (!accessible.includes(options.facilityId)) {
      return [];
    }

    where.facilityId = options.facilityId;
  } else if (user.role === 'rhmt' || user.role === 'chmt') {
    const accessible = await resolveAccessibleFacilityIds(user);
    where.facilityId = {
      in: accessible
    };
  } else if (user.role !== 'moh' && user.role !== 'ml_engineer') {
    where.facilityId = user.facilityId || '__none__';
  }

  const logs = await prisma.auditLog.findMany({
    where,
    orderBy: {
      createdAt: 'asc'
    },
    take: limit
  });

  return logs.map((log) => ({
    id: log.id,
    cursor: `${toDateIso(log.createdAt)}|${log.id}`,
    facilityId: log.facilityId,
    eventType: log.details?.eventType || 'mutation',
    operation: log.details?.operation || null,
    entityType: log.details?.entityType || null,
    entityId: log.details?.entityId || null,
    payload: log.details?.payload || {},
    actorUserId: log.details?.actorUserId || null,
    createdAt: toDateIso(log.createdAt)
  }));
}

module.exports = {
  DEMO_PASSWORD,
  getFacilityById,
  listFacilities,
  getUserByEmail,
  getUserById,
  toPublicUser,
  canAccessFacility,
  canAccessPatient,
  listPatientsForUser,
  getPatientById,
  getPatientForUser,
  getVisitById,
  getVisitForUser,
  listVisitsForPatient,
  createPatientForUser,
  updatePatientForUser,
  createVisitForUser,
  createPrediction,
  getPredictionForUser,
  listPredictionsForPatient,
  updatePredictionOverrideForUser,
  createTasks,
  listTasksForUser,
  getTaskForUser,
  updateTaskForUser,
  createRiskAlert,
  listAlertsForUser,
  getAlertForUser,
  updateAlertForUser,
  updateAlertChannels,
  createAuditLog,
  listAuditLogsForUser,
  appendSyncEvent,
  listSyncEventsForUser,
  upsertFacilitiesFromSync,
  buildDataQualitySnapshot,
  buildFairnessSnapshot
};
