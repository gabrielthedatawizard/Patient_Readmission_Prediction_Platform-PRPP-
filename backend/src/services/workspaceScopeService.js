const HIERARCHY_BROWSE_ROLES = new Set(['moh', 'rhmt', 'chmt', 'ml_engineer']);
const MODE_SWITCH_ROLES = new Set(['moh', 'ml_engineer']);

function normalizeRole(role) {
  return String(role || '')
    .trim()
    .toLowerCase();
}

function normalizeText(value) {
  return String(value || '').trim();
}

function normalizeRegionCode(value) {
  return String(value || '')
    .trim()
    .toUpperCase();
}

function getFacilitySourceLabel(dhis2Status = {}, facilities = []) {
  const dhis2BackedFacilities = facilities.filter(
    (facility) => facility?.dhis2OrgUnitId || facility?.dhis2Code
  );

  const baseUrl = String(dhis2Status?.baseUrl || '').toLowerCase();
  if (baseUrl.includes('play.dhis2.org') || baseUrl.includes('play.im.dhis2.org')) {
    return 'dhis2_demo';
  }

  if (dhis2Status?.configured && baseUrl) {
    return 'dhis2_live';
  }

  if (!dhis2BackedFacilities.length) {
    return 'seeded';
  }

  return 'seeded';
}

function filterFacilitiesForUser(user, facilities = []) {
  const role = normalizeRole(user?.role);
  const regionCode = normalizeRegionCode(user?.regionCode);
  const facilityId = normalizeText(user?.facilityId);
  const district = normalizeText(user?.district);

  if (role === 'moh' || role === 'ml_engineer') {
    return facilities;
  }

  if (role === 'rhmt' || role === 'chmt') {
    return facilities.filter((facility) => {
      if (normalizeRegionCode(facility?.regionCode) !== regionCode) {
        return false;
      }

      if (role === 'chmt' && district) {
        return normalizeText(facility?.district) === district;
      }

      return true;
    });
  }

  if (!facilityId) {
    return [];
  }

  return facilities.filter((facility) => normalizeText(facility?.id) === facilityId);
}

function deriveDistrictForUser(user, facilities = []) {
  if (normalizeText(user?.district)) {
    return normalizeText(user.district);
  }

  if (normalizeRole(user?.role) === 'chmt') {
    const districts = Array.from(
      new Set(
        facilities
          .map((facility) => normalizeText(facility?.district))
          .filter(Boolean)
      )
    );

    return districts.length === 1 ? districts[0] : null;
  }

  if (normalizeText(user?.facilityId)) {
    const facility = facilities.find(
      (entry) => normalizeText(entry?.id) === normalizeText(user.facilityId)
    );
    return normalizeText(facility?.district) || null;
  }

  return null;
}

function buildGroupedHierarchy(facilities = []) {
  const regions = new Map();

  facilities.forEach((facility) => {
    const regionCode = normalizeRegionCode(facility?.regionCode) || 'UNKNOWN';
    const regionName = normalizeText(facility?.region) || regionCode;
    const districtName = normalizeText(facility?.district) || 'Unknown District';

    if (!regions.has(regionCode)) {
      regions.set(regionCode, {
        id: `region:${regionCode}`,
        hierarchyLevel: 'region',
        regionCode,
        name: regionName,
        facilityCount: 0,
        districts: new Map()
      });
    }

    const region = regions.get(regionCode);
    region.facilityCount += 1;

    if (!region.districts.has(districtName)) {
      region.districts.set(districtName, {
        id: `district:${regionCode}:${districtName}`,
        hierarchyLevel: 'district',
        regionCode,
        district: districtName,
        name: districtName,
        facilityCount: 0,
        facilities: []
      });
    }

    const district = region.districts.get(districtName);
    district.facilityCount += 1;
    district.facilities.push({
      id: facility.id,
      facilityId: facility.id,
      name: facility.name,
      district: districtName,
      regionCode,
      region: regionName,
      level: facility.level,
      dhis2OrgUnitId: facility.dhis2OrgUnitId || null,
      dhis2Code: facility.dhis2Code || null,
      hierarchyLevel: 'facility'
    });
  });

  return Array.from(regions.values())
    .sort((left, right) => left.name.localeCompare(right.name))
    .map((region) => ({
      ...region,
      districts: Array.from(region.districts.values())
        .sort((left, right) => left.name.localeCompare(right.name))
        .map((district) => ({
          ...district,
          facilities: district.facilities.sort((left, right) =>
            left.name.localeCompare(right.name)
          )
        }))
    }));
}

function sanitizeSelection(user, facilities = [], selection = {}) {
  const role = normalizeRole(user?.role);
  const accessibleFacilities = filterFacilitiesForUser(user, facilities);
  const accessibleTree = buildGroupedHierarchy(accessibleFacilities);
  const accessibleRegionCodes = accessibleTree.map((region) => region.regionCode);
  const defaultDistrict = deriveDistrictForUser(user, accessibleFacilities);
  const defaultFacility = accessibleFacilities.find(
    (facility) => normalizeText(facility?.id) === normalizeText(user?.facilityId)
  );

  let regionCode =
    normalizeRegionCode(selection.regionCode) ||
    normalizeRegionCode(user?.regionCode) ||
    (accessibleRegionCodes.length === 1 ? accessibleRegionCodes[0] : null);

  if (regionCode && !accessibleRegionCodes.includes(regionCode)) {
    regionCode = accessibleRegionCodes.length === 1 ? accessibleRegionCodes[0] : null;
  }

  const regionalFacilities = regionCode
    ? accessibleFacilities.filter(
        (facility) => normalizeRegionCode(facility?.regionCode) === regionCode
      )
    : accessibleFacilities;

  const accessibleDistricts = Array.from(
    new Set(
      regionalFacilities
        .map((facility) => normalizeText(facility?.district))
        .filter(Boolean)
    )
  );

  let district =
    normalizeText(selection.district) ||
    normalizeText(defaultDistrict) ||
    (role === 'facility_manager' ||
    role === 'clinician' ||
    role === 'nurse' ||
    role === 'pharmacist' ||
    role === 'hro' ||
    role === 'chw'
      ? normalizeText(defaultFacility?.district)
      : null);

  if (district && !accessibleDistricts.includes(district)) {
    district = defaultDistrict && accessibleDistricts.includes(defaultDistrict)
      ? defaultDistrict
      : null;
  }

  const districtFacilities = district
    ? regionalFacilities.filter(
        (facility) => normalizeText(facility?.district) === district
      )
    : regionalFacilities;

  const accessibleFacilityIds = districtFacilities.map((facility) => normalizeText(facility.id));
  let facilityId =
    normalizeText(selection.facilityId) ||
    normalizeText(defaultFacility?.id) ||
    null;

  if (facilityId && !accessibleFacilityIds.includes(facilityId)) {
    facilityId = normalizeText(defaultFacility?.id) || null;
  }

  let hierarchyLevel = normalizeText(selection.hierarchyLevel) || null;
  if (
    role === 'facility_manager' ||
    role === 'clinician' ||
    role === 'nurse' ||
    role === 'pharmacist' ||
    role === 'hro' ||
    role === 'chw'
  ) {
    hierarchyLevel = 'facility';
  } else if (facilityId) {
    hierarchyLevel = 'facility';
  } else if (district) {
    hierarchyLevel = 'district';
  } else if (regionCode) {
    hierarchyLevel = 'region';
  } else {
    hierarchyLevel = 'national';
  }

  const facility = districtFacilities.find(
    (entry) => normalizeText(entry?.id) === facilityId
  ) || null;
  const regionNode = accessibleTree.find((entry) => entry.regionCode === regionCode) || null;

  return {
    hierarchyLevel,
    regionCode: regionCode || null,
    district: district || null,
    facilityId: facility?.id || null,
    facilityName: facility?.name || null,
    regionName: regionNode?.name || facility?.region || null,
    accessibleFacilities,
    visibleFacilities: districtFacilities,
    tree: accessibleTree
  };
}

function getDefaultOperationalMode() {
  const configured = String(process.env.TRIP_DEFAULT_OPERATIONAL_MODE || '')
    .trim()
    .toLowerCase();

  if (configured === 'sandbox' || configured === 'normal') {
    return configured;
  }

  return 'normal';
}

function buildWorkspaceContext(user, facilities = [], dhis2Status = {}) {
  const role = normalizeRole(user?.role);
  const selection = sanitizeSelection(user, facilities, {});
  const facilitySource = getFacilitySourceLabel(dhis2Status, selection.accessibleFacilities);
  const canBrowseHierarchy = HIERARCHY_BROWSE_ROLES.has(role);
  const canSwitchOperationalMode = MODE_SWITCH_ROLES.has(role);
  const defaultOperationalMode = canSwitchOperationalMode
    ? getDefaultOperationalMode()
    : 'normal';

  return {
    role,
    assignments: {
      regionCode: normalizeRegionCode(user?.regionCode) || null,
      district: deriveDistrictForUser(user, selection.accessibleFacilities),
      facilityId: normalizeText(user?.facilityId) || null,
      ward: normalizeText(user?.ward) ? String(user.ward).trim() : null
    },
    capabilities: {
      canBrowseHierarchy,
      canSwitchOperationalMode,
      allowedOperationalModes: canSwitchOperationalMode ? ['normal', 'sandbox'] : ['normal'],
      allowedFacilitySources:
        facilitySource === 'seeded'
          ? ['seeded']
          : [facilitySource, 'seeded']
    },
    defaultScope: {
      hierarchyLevel: selection.hierarchyLevel,
      regionCode: selection.regionCode,
      district: selection.district,
      facilityId: selection.facilityId,
      facilityName: selection.facilityName,
      facilitySource,
      operationalMode: defaultOperationalMode
    },
    counts: {
      accessibleFacilities: selection.accessibleFacilities.length,
      accessibleRegions: selection.tree.length,
      accessibleDistricts: selection.tree.reduce(
        (count, region) => count + region.districts.length,
        0
      )
    }
  };
}

function buildHierarchyTreeForUser(user, facilities = [], dhis2Status = {}) {
  const selection = sanitizeSelection(user, facilities, {});
  const facilitySource = getFacilitySourceLabel(dhis2Status, selection.accessibleFacilities);

  return {
    facilitySource,
    counts: {
      regions: selection.tree.length,
      districts: selection.tree.reduce(
        (count, region) => count + region.districts.length,
        0
      ),
      facilities: selection.accessibleFacilities.length
    },
    tree: selection.tree
  };
}

function buildFacilityDirectoryForUser(user, facilities = [], query = {}, dhis2Status = {}) {
  const selection = sanitizeSelection(user, facilities, query);
  const facilitySource = getFacilitySourceLabel(dhis2Status, selection.accessibleFacilities);

  const rows = selection.visibleFacilities
    .map((facility) => ({
      id: facility.id,
      name: facility.name,
      regionCode: facility.regionCode || null,
      region: facility.region || null,
      district: facility.district || null,
      level: facility.level || null,
      dhis2OrgUnitId: facility.dhis2OrgUnitId || null,
      dhis2Code: facility.dhis2Code || null
    }))
    .sort((left, right) => left.name.localeCompare(right.name));

  return {
    scope: {
      hierarchyLevel: selection.hierarchyLevel,
      regionCode: selection.regionCode,
      regionName: selection.regionName,
      district: selection.district,
      facilityId: selection.facilityId,
      facilityName: selection.facilityName
    },
    facilitySource,
    count: rows.length,
    facilities: rows
  };
}

module.exports = {
  buildFacilityDirectoryForUser,
  buildHierarchyTreeForUser,
  buildWorkspaceContext,
  filterFacilitiesForUser,
  getFacilitySourceLabel,
  sanitizeSelection
};
