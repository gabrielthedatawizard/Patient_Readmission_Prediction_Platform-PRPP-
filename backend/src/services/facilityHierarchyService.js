function normalizeText(value, fallback = null) {
  const normalized = String(value || '').trim();
  return normalized || fallback;
}

function getAncestorFacilityIds(facilityMap, facilityId) {
  const ids = new Set();
  let current = facilityMap.get(facilityId) || null;

  while (current?.parentId) {
    ids.add(current.parentId);
    current = facilityMap.get(current.parentId) || null;
  }

  return ids;
}

function buildFacilityHierarchyTree(facilities = [], options = {}) {
  const rootFacilityId = options.rootFacilityId || null;
  const facilityMap = new Map(facilities.map((facility) => [facility.id, facility]));

  const scopedFacilities = rootFacilityId
    ? facilities.filter((facility) => {
        if (facility.id === rootFacilityId) {
          return true;
        }

        return getAncestorFacilityIds(facilityMap, facility.id).has(rootFacilityId);
      })
    : facilities;

  const zoneMap = new Map();

  for (const facility of scopedFacilities) {
    const zoneCode = normalizeText(facility.zoneCode, 'UNASSIGNED');
    const zoneName = normalizeText(facility.zoneName, 'Unassigned Zone');
    const regionCode = normalizeText(facility.regionCode, 'UNASSIGNED');
    const regionName = normalizeText(facility.regionName, regionCode);
    const districtName = normalizeText(facility.district, 'Unassigned District');

    if (!zoneMap.has(zoneCode)) {
      zoneMap.set(zoneCode, {
        id: zoneCode,
        code: zoneCode,
        name: zoneName,
        regions: new Map()
      });
    }

    const zoneNode = zoneMap.get(zoneCode);
    if (!zoneNode.regions.has(regionCode)) {
      zoneNode.regions.set(regionCode, {
        id: regionCode,
        code: regionCode,
        name: regionName,
        districts: new Map()
      });
    }

    const regionNode = zoneNode.regions.get(regionCode);
    if (!regionNode.districts.has(districtName)) {
      regionNode.districts.set(districtName, {
        id: `${regionCode}:${districtName}`,
        name: districtName,
        facilities: []
      });
    }

    regionNode.districts.get(districtName).facilities.push({
      id: facility.id,
      name: facility.name,
      level: facility.level,
      tier: facility.tier || null,
      parentId: facility.parentId || null,
      councilName: facility.councilName || null,
      isActive: facility.isActive !== false
    });
  }

  return Array.from(zoneMap.values())
    .map((zone) => ({
      id: zone.id,
      code: zone.code,
      name: zone.name,
      regions: Array.from(zone.regions.values())
        .map((region) => ({
          id: region.id,
          code: region.code,
          name: region.name,
          districts: Array.from(region.districts.values())
            .map((district) => ({
              id: district.id,
              name: district.name,
              facilities: district.facilities.sort((left, right) =>
                left.name.localeCompare(right.name)
              )
            }))
            .sort((left, right) => left.name.localeCompare(right.name))
        }))
        .sort((left, right) => left.name.localeCompare(right.name))
    }))
    .sort((left, right) => left.name.localeCompare(right.name));
}

module.exports = {
  buildFacilityHierarchyTree
};
