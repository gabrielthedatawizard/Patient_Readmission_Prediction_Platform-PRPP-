const { fetchOrganisationUnits, getDhis2Config, pushDataValueSet } = require('../integrations/dhis2Client');
const { upsertFacilitiesFromSync, listFacilities } = require('../data');

const READMISSION_DATA_ELEMENT = process.env.TRIP_DHIS2_READMISSION_DATA_ELEMENT || 'TRIP_READMISSION_RATE_30D';

function splitList(value, fallback = []) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }

  if (value === undefined || value === null || value === '') {
    return fallback;
  }

  return String(value)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function slugify(value) {
  return String(value || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
}

function normalizeIdentifier(unit) {
  return slugify(unit.code || unit.id || unit.displayName || unit.name || 'facility');
}

function inferFacilityLevel(unit, levelMapping) {
  const explicit = levelMapping[String(unit.level)];
  if (explicit) {
    return explicit;
  }

  const text = `${unit.displayName || unit.name || ''} ${unit.shortName || ''}`.toLowerCase();
  if (text.includes('national')) {
    return 'national_referral';
  }
  if (text.includes('zonal')) {
    return 'zonal_referral';
  }
  if (text.includes('regional')) {
    return 'regional_referral';
  }
  if (text.includes('district')) {
    return 'district';
  }
  if (text.includes('health centre') || text.includes('health center')) {
    return 'health_centre';
  }
  if (text.includes('dispensary')) {
    return 'dispensary';
  }

  return `dhis2_level_${unit.level}`;
}

function parseLevelMapping(rawValue) {
  if (!rawValue) {
    return {};
  }

  if (typeof rawValue === 'object' && !Array.isArray(rawValue)) {
    return rawValue;
  }

  try {
    const parsed = JSON.parse(String(rawValue));
    return typeof parsed === 'object' && parsed !== null ? parsed : {};
  } catch (error) {
    return {};
  }
}

function findAncestorByLevel(unit, desiredLevel) {
  const ancestors = Array.isArray(unit.ancestors) ? unit.ancestors : [];
  return ancestors.find((ancestor) => Number(ancestor.level) === Number(desiredLevel)) || null;
}

function deriveRegion(unit, config) {
  const regionAncestor =
    findAncestorByLevel(unit, config.regionLevel) ||
    (Array.isArray(unit.ancestors) ? unit.ancestors[1] : null) ||
    unit.parent ||
    null;

  const regionName = String(
    regionAncestor?.displayName || regionAncestor?.name || 'Unknown Region'
  ).trim();
  const regionCode = slugify(regionAncestor?.code || regionName || 'UNKNOWN') || 'UNKNOWN';

  return {
    regionName,
    regionCode
  };
}

function deriveDistrict(unit, config) {
  const districtAncestor =
    findAncestorByLevel(unit, config.districtLevel) ||
    unit.parent ||
    null;

  return String(districtAncestor?.displayName || districtAncestor?.name || 'Unknown District').trim();
}

function mapOrganisationUnitToFacility(unit, config) {
  const { regionName, regionCode } = deriveRegion(unit, config);
  const district = deriveDistrict(unit, config);
  const normalizedId = normalizeIdentifier(unit);

  return {
    id: `FAC-DHIS2-${normalizedId || slugify(unit.id || 'UNKNOWN')}`,
    name: String(unit.displayName || unit.name || unit.shortName || unit.code || unit.id).trim(),
    level: inferFacilityLevel(unit, config.levelMapping),
    district,
    regionCode,
    regionName,
    dhis2OrgUnitId: String(unit.id),
    dhis2Code: unit.code ? String(unit.code).trim() : null
  };
}

function dedupeFacilities(entries = []) {
  const deduped = new Map();

  entries.forEach((entry) => {
    const key = entry.dhis2OrgUnitId || entry.dhis2Code || entry.id;
    if (!deduped.has(key)) {
      deduped.set(key, entry);
    }
  });

  return Array.from(deduped.values());
}

function buildSyncOptions(overrides = {}) {
  const baseConfig = getDhis2Config(overrides);
  const previewSampleLimit = Number(
    overrides.previewSampleLimit || process.env.DHIS2_PREVIEW_SAMPLE_LIMIT || 25
  );
  return {
    ...baseConfig,
    dryRun: overrides.dryRun !== false,
    previewSampleLimit: Number.isFinite(previewSampleLimit)
      ? Math.max(5, Math.min(previewSampleLimit, 100))
      : 25,
    levelMapping: parseLevelMapping(overrides.levelMapping || process.env.DHIS2_LEVEL_MAP)
  };
}

async function syncDhis2Facilities(overrides = {}) {
  const options = buildSyncOptions(overrides);
  const units = await fetchOrganisationUnits(options);
  const facilityEntries = dedupeFacilities(
    units.map((unit) => mapOrganisationUnitToFacility(unit, options))
  );
  const syncResult = await upsertFacilitiesFromSync(facilityEntries, {
    dryRun: options.dryRun,
    responseSampleLimit: options.previewSampleLimit
  });
  const previewFacilities = syncResult.facilities.slice(0, options.previewSampleLimit);
  const previewTruncated =
    Boolean(syncResult.facilitiesTruncated) ||
    syncResult.facilities.length > previewFacilities.length;

  return {
    generatedAt: new Date().toISOString(),
    dryRun: options.dryRun,
    source: {
      type: 'dhis2',
      rootOrgUnitId: options.rootOrgUnitId,
      facilityLevels: options.facilityLevels,
      regionLevel: options.regionLevel,
      districtLevel: options.districtLevel
    },
    summary: {
      sourceOrgUnitCount: units.length,
      total: syncResult.total,
      imported: syncResult.imported,
      updated: syncResult.updated,
      matchedByName: syncResult.matchedByName,
      previewCount: previewFacilities.length,
      previewTruncated
    },
    facilities: previewFacilities
  };
}

function parseYearMonth(value) {
  const normalized = String(value || '').trim();
  const match = normalized.match(/^(\d{4})-?(\d{2})$/);
  if (!match) {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  }
  return { year: Number(match[1]), month: Number(match[2]) - 1 };
}

async function pushReadmissionRates(yearMonth, overrides = {}) {
  const config = getDhis2Config(overrides);
  const dryRun = overrides.dryRun !== false;
  const { year, month } = parseYearMonth(yearMonth);

  const periodStart = new Date(year, month, 1);
  const periodEnd = new Date(year, month + 1, 1);
  const dhis2Period = `${year}${String(month + 1).padStart(2, '0')}`;

  let prismaClient = null;
  try {
    const lib = require('../lib/prisma');
    prismaClient = lib.prisma;
  } catch (error) {
    return {
      dryRun,
      period: dhis2Period,
      dataElement: READMISSION_DATA_ELEMENT,
      error: 'Prisma data provider is not available. Run in prisma mode to push readmission rates.',
      pushed: 0,
      dataValues: []
    };
  }

  const [readmissionGroups, dischargeGroups, facilities] = await Promise.all([
    prismaClient.readmissionEvent.groupBy({
      by: ['facilityId'],
      where: {
        detectedAt: { gte: periodStart, lt: periodEnd }
      },
      _count: { id: true }
    }),
    prismaClient.visit.groupBy({
      by: ['facilityId'],
      where: {
        dischargeDate: { gte: periodStart, lt: periodEnd }
      },
      _count: { id: true }
    }),
    listFacilities()
  ]);

  const facilityById = new Map(facilities.map((f) => [f.id, f]));
  const readmissionByFacility = new Map(
    readmissionGroups.map((row) => [row.facilityId, row._count.id])
  );
  const dischargeByFacility = new Map(
    dischargeGroups.map((row) => [row.facilityId, row._count.id])
  );

  const dataValues = [];
  for (const [facilityId, discharges] of dischargeByFacility) {
    const facility = facilityById.get(facilityId);
    const dhis2OrgUnitId = facility?.dhis2OrgUnitId;
    if (!dhis2OrgUnitId || !discharges) {
      continue;
    }

    const readmissions = readmissionByFacility.get(facilityId) || 0;
    const rate = Number((readmissions / discharges).toFixed(4));

    dataValues.push({
      dataElement: READMISSION_DATA_ELEMENT,
      orgUnit: dhis2OrgUnitId,
      period: dhis2Period,
      value: String(rate)
    });
  }

  if (dryRun || !config.baseUrl) {
    return {
      dryRun: true,
      period: dhis2Period,
      dataElement: READMISSION_DATA_ELEMENT,
      pushed: 0,
      dataValues
    };
  }

  const dhis2Response = await pushDataValueSet(dataValues, overrides);

  return {
    dryRun: false,
    period: dhis2Period,
    dataElement: READMISSION_DATA_ELEMENT,
    pushed: dataValues.length,
    dataValues,
    dhis2Response
  };
}

module.exports = {
  buildSyncOptions,
  mapOrganisationUnitToFacility,
  syncDhis2Facilities,
  pushReadmissionRates
};
