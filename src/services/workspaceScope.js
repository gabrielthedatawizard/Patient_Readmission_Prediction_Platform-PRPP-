function safeTrim(value) {
  return String(value || "").trim();
}

export function buildScopeQueryParams(scope = {}) {
  const query = new URLSearchParams();

  [
    "hierarchyLevel",
    "regionCode",
    "district",
    "facilityId",
    "operationalMode",
  ].forEach((key) => {
    const value = safeTrim(scope[key]);
    if (value) {
      query.set(key, value);
    }
  });

  return query;
}

export function appendScopeToPath(path, scope = {}) {
  if (!path) {
    return path;
  }

  const query = buildScopeQueryParams(scope);
  if (!query.toString()) {
    return path;
  }

  const [basePath, existingQuery = ""] = String(path).split("?");
  const merged = new URLSearchParams(existingQuery);

  query.forEach((value, key) => {
    if (!merged.has(key)) {
      merged.set(key, value);
    }
  });

  const suffix = merged.toString();
  return suffix ? `${basePath}?${suffix}` : basePath;
}

export function buildScopeLabel(scope = {}, currentUser = null) {
  if (scope.hierarchyLevel === "facility") {
    return {
      title: scope.facilityName || "Facility workspace",
      subtitle:
        [scope.district, scope.regionName || scope.regionCode].filter(Boolean).join(" • ") ||
        "Facility operations",
      badge:
        scope.facilitySource === "dhis2_demo"
          ? "DHIS2 demo facility"
          : scope.facilitySource === "dhis2_live"
            ? "DHIS2 live facility"
            : "Local facility",
    };
  }

  if (scope.hierarchyLevel === "district") {
    return {
      title: scope.district || "District workspace",
      subtitle:
        [scope.regionName || scope.regionCode, "District view"].filter(Boolean).join(" • ") ||
        "District oversight",
      badge: "District scope",
    };
  }

  if (scope.hierarchyLevel === "region") {
    return {
      title: scope.regionName || scope.regionCode || "Regional workspace",
      subtitle: "Regional oversight",
      badge: "Regional scope",
    };
  }

  return {
    title: "Tanzania National View",
    subtitle:
      currentUser?.role === "ml-engineer"
        ? "Anonymised national model workspace"
        : "National intelligence workspace",
    badge: "National scope",
  };
}

export function supportsScopeBrowsing(capabilities = {}) {
  return Boolean(capabilities.canBrowseHierarchy);
}

export function supportsSandboxMode(capabilities = {}) {
  return Boolean(capabilities.canSwitchOperationalMode);
}
