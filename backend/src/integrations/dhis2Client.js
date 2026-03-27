const DEFAULT_FIELDS = [
  'id',
  'displayName',
  'name',
  'shortName',
  'code',
  'level',
  'path',
  'parent[id,displayName,name,code,level]',
  'ancestors[id,displayName,name,code,level]'
].join(',');

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

function toNumberList(value, fallback = []) {
  return splitList(value, fallback).map((item) => Number(item)).filter(Number.isFinite);
}

function normalizeBaseUrl(value) {
  return String(value || '').trim().replace(/\/$/, '');
}

function getDhis2Config(overrides = {}) {
  const baseUrl = normalizeBaseUrl(overrides.baseUrl || process.env.DHIS2_BASE_URL);
  const username = String(overrides.username || process.env.DHIS2_USERNAME || '').trim();
  const password = String(overrides.password || process.env.DHIS2_PASSWORD || '').trim();
  const rootOrgUnitId = String(
    overrides.rootOrgUnitId || process.env.DHIS2_ROOT_ORG_UNIT || ''
  ).trim();
  const facilityLevels = toNumberList(
    overrides.facilityLevels || process.env.DHIS2_FACILITY_LEVELS,
    [4, 5, 6]
  );
  const regionLevel = Number(
    overrides.regionLevel || process.env.DHIS2_REGION_LEVEL || 2
  );
  const districtLevel = Number(
    overrides.districtLevel || process.env.DHIS2_DISTRICT_LEVEL || 3
  );
  const timeoutMs = Number(
    overrides.timeoutMs || process.env.DHIS2_TIMEOUT_MS || 10000
  );

  return {
    baseUrl,
    username,
    password,
    rootOrgUnitId: rootOrgUnitId || null,
    facilityLevels,
    regionLevel: Number.isFinite(regionLevel) ? regionLevel : 2,
    districtLevel: Number.isFinite(districtLevel) ? districtLevel : 3,
    timeoutMs: Number.isFinite(timeoutMs) ? timeoutMs : 10000
  };
}

function getDhis2ConfigStatus(overrides = {}) {
  const config = getDhis2Config(overrides);
  const configured = Boolean(config.baseUrl && config.username && config.password);

  return {
    configured,
    status: configured ? 'configured' : 'not_configured',
    baseUrl: config.baseUrl || null,
    rootOrgUnitId: config.rootOrgUnitId,
    facilityLevels: config.facilityLevels,
    regionLevel: config.regionLevel,
    districtLevel: config.districtLevel,
    timeoutMs: config.timeoutMs,
    authMode: configured ? 'basic' : 'none'
  };
}

function createConfigError() {
  const error = new Error(
    'DHIS2 integration is not configured. Set DHIS2_BASE_URL, DHIS2_USERNAME, and DHIS2_PASSWORD.'
  );
  error.statusCode = 503;
  error.code = 'DHIS2_NOT_CONFIGURED';
  error.publicMessage = 'DHIS2 integration is not configured.';
  return error;
}

function createRequestError(status, message) {
  const error = new Error(message || `DHIS2 request failed with status ${status}.`);
  error.statusCode = status >= 400 && status < 600 ? status : 502;
  error.code = 'DHIS2_REQUEST_FAILED';
  error.publicMessage = 'DHIS2 request failed.';
  return error;
}

async function fetchOrganisationUnits(overrides = {}) {
  const config = getDhis2Config(overrides);
  if (!config.baseUrl || !config.username || !config.password) {
    throw createConfigError();
  }

  const params = new URLSearchParams({
    fields: DEFAULT_FIELDS,
    paging: 'false'
  });
  const url = `${config.baseUrl}/api/organisationUnits.json?${params.toString()}`;
  const auth = Buffer.from(`${config.username}:${config.password}`).toString('base64');
  const controller = new AbortController();
  const timeoutHandle = setTimeout(() => controller.abort(), config.timeoutMs);

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: `Basic ${auth}`
      },
      signal: controller.signal
    });

    if (!response.ok) {
      let payload = {};
      try {
        payload = await response.json();
      } catch (error) {
        payload = {};
      }
      throw createRequestError(
        response.status,
        payload?.message || payload?.response?.description || `DHIS2 request failed with status ${response.status}.`
      );
    }

    const payload = await response.json();
    const units = Array.isArray(payload.organisationUnits) ? payload.organisationUnits : [];

    return units.filter((unit) => {
      const levelAllowed =
        !config.facilityLevels.length || config.facilityLevels.includes(Number(unit.level));
      if (!levelAllowed) {
        return false;
      }

      if (!config.rootOrgUnitId) {
        return true;
      }

      const path = String(unit.path || '');
      if (path.includes(`/${config.rootOrgUnitId}`)) {
        return true;
      }

      const ancestorIds = Array.isArray(unit.ancestors)
        ? unit.ancestors.map((ancestor) => String(ancestor.id || ''))
        : [];
      return ancestorIds.includes(config.rootOrgUnitId) || String(unit.id) === config.rootOrgUnitId;
    });
  } catch (error) {
    if (error.name === 'AbortError') {
      throw createRequestError(504, 'DHIS2 request timed out.');
    }
    throw error;
  } finally {
    clearTimeout(timeoutHandle);
  }
}

module.exports = {
  getDhis2Config,
  getDhis2ConfigStatus,
  fetchOrganisationUnits
};
