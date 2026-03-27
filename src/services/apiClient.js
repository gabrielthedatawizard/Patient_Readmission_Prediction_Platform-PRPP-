import {
  buildApiUrl,
  getProtectedDeploymentMessage
} from "./runtimeConfig";

// Clear legacy browser-stored session data, but do not persist JWTs client-side.
const TOKEN_KEY = 'trip_access_token';
const USER_KEY = 'trip_session_user';

const ROLE_TO_BACKEND = {
  'facility-manager': 'facility_manager',
  'ml-engineer': 'ml_engineer'
};

const ROLE_TO_UI = {
  facility_manager: 'facility-manager',
  ml_engineer: 'ml-engineer'
};

function parseErrorMessage(input) {
  if (!input) {
    return null;
  }

  if (typeof input === 'string') {
    return input.trim() || null;
  }

  if (input instanceof Error && typeof input.message === 'string') {
    return input.message.trim() || null;
  }

  if (Array.isArray(input)) {
    for (const item of input) {
      const resolved = parseErrorMessage(item);
      if (resolved) {
        return resolved;
      }
    }
    return null;
  }

  if (typeof input === 'object') {
    const candidates = [
      input.message,
      input.error,
      input.details,
      input.reason,
      input.title
    ];

    for (const candidate of candidates) {
      const resolved = parseErrorMessage(candidate);
      if (resolved) {
        return resolved;
      }
    }
  }

  return null;
}

function isBrowser() {
  return typeof window !== 'undefined';
}

function getStorageFromRememberMe(rememberMe) {
  if (!isBrowser()) {
    return null;
  }

  try {
    return rememberMe ? window.localStorage : window.sessionStorage;
  } catch (error) {
    return null;
  }
}

function getAnyStorageValue(key) {
  if (!isBrowser()) {
    return null;
  }

  try {
    return window.localStorage.getItem(key) || window.sessionStorage.getItem(key);
  } catch (error) {
    return null;
  }
}

function removeStorageValue(key) {
  if (!isBrowser()) {
    return;
  }

  try {
    window.localStorage.removeItem(key);
    window.sessionStorage.removeItem(key);
  } catch (error) {
    // Ignore storage cleanup errors when storage is unavailable.
  }
}

export function normalizeRoleForBackend(role) {
  return ROLE_TO_BACKEND[role] || role;
}

export function normalizeRoleForUi(role) {
  return ROLE_TO_UI[role] || role;
}

export function getStoredToken() {
  return null;
}

export function getStoredUser() {
  const raw = getAnyStorageValue(USER_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw);
  } catch (error) {
    return null;
  }
}

export function clearSession() {
  removeStorageValue(TOKEN_KEY);
  removeStorageValue(USER_KEY);
}

function persistSession({ user }, rememberMe = true) {
  const storage = getStorageFromRememberMe(rememberMe);

  // Keep only one active persistence location and clear legacy access tokens.
  clearSession();

  if (!storage || !user) {
    return;
  }

  try {
    storage.setItem(USER_KEY, JSON.stringify(user));
  } catch (error) {
    // Storage write failures should not crash authentication flow.
  }
}

async function performRequest(path, { method = 'GET', body, token, headers: extraHeaders } = {}) {
  const headers = {
    Accept: 'application/json',
    ...(extraHeaders || {})
  };

  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(buildApiUrl(path), {
    method,
    headers,
    credentials: 'include',
    body: body !== undefined ? JSON.stringify(body) : undefined
  });

  return response;
}

function buildRequestError(response, payload, text) {
  const message =
    parseErrorMessage(payload) ||
    getProtectedDeploymentMessage(text) ||
    `Request failed with status ${response.status}`;
  const error = new Error(message);
  error.status = response.status;
  error.payload = payload;
  error.responseText = text;
  return error;
}

export async function requestJson(path, options = {}) {
  const response = await performRequest(path, options);

  const text = await response.text();
  const contentType = response.headers.get('content-type') || '';
  const payload = contentType.includes('application/json') && text ? safeParseJson(text) : null;

  if (!response.ok) {
    throw buildRequestError(response, payload, text);
  }

  return payload;
}

export async function requestBlob(path, options = {}) {
  const response = await performRequest(path, options);

  if (!response.ok) {
    const text = await response.text();
    const contentType = response.headers.get('content-type') || '';
    const payload = contentType.includes('application/json') && text ? safeParseJson(text) : null;
    throw buildRequestError(response, payload, text);
  }

  return {
    blob: await response.blob(),
    contentType: response.headers.get('content-type') || ''
  };
}

async function request(path, options = {}) {
  return requestJson(path, options);
}

function safeParseJson(value) {
  try {
    return JSON.parse(value);
  } catch (error) {
    return null;
  }
}

export async function login({ email, password, rememberMe = true }) {
  const payload = await request('/auth/login', {
    method: 'POST',
    body: { email, password, rememberMe }
  });

  const session = {
    user: {
      ...payload.user,
      role: normalizeRoleForUi(payload.user?.role)
    }
  };

  persistSession(session, rememberMe);
  return session;
}

export async function fetchCurrentUser() {
  const payload = await request('/auth/me');
  return {
    ...payload.user,
    role: normalizeRoleForUi(payload.user?.role)
  };
}

export async function logout() {
  try {
    await request('/auth/logout', { method: 'POST' });
  } catch (error) {
    // Logout endpoint failure should not block local session cleanup.
  }

  clearSession();
}

export async function fetchPatients(filters = {}) {
  const query = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      query.set(key, String(value));
    }
  });

  const suffix = query.toString() ? `?${query.toString()}` : '';
  const payload = await request(`/patients${suffix}`);
  return payload?.patients || [];
}

export async function createPatientEncounter(patientId, encounter = {}) {
  const payload = await request(`/patients/${patientId}/encounters`, {
    method: 'POST',
    body: encounter
  });

  return payload?.encounter || null;
}

export async function updatePatient(patientId, patch = {}) {
  const payload = await request(`/patients/${patientId}`, {
    method: 'PUT',
    body: patch
  });

  return payload?.patient || null;
}

export async function fetchTasks(filters = {}) {
  const query = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      query.set(key, String(value));
    }
  });

  const suffix = query.toString() ? `?${query.toString()}` : '';
  const payload = await request(`/tasks${suffix}`);
  return payload?.tasks || [];
}

function normalizeTaskStatusForApi(status) {
  if (!status) {
    return status;
  }

  if (status === 'completed') {
    return 'done';
  }

  return status;
}

function normalizeTaskStatusForUi(status) {
  if (!status) {
    return status;
  }

  if (status === 'done') {
    return 'completed';
  }

  return status;
}

export async function updateTask(taskId, patch = {}) {
  const payload = await request(`/tasks/${taskId}`, {
    method: 'PATCH',
    body: {
      ...patch,
      status:
        patch.status !== undefined
          ? normalizeTaskStatusForApi(patch.status)
          : undefined
    }
  });

  const task = payload?.task || null;
  if (!task) {
    return null;
  }

  return {
    ...task,
    status: normalizeTaskStatusForUi(task.status)
  };
}

export async function fetchLatestPrediction(patientId) {
  try {
    const payload = await request(`/predictions/results/${patientId}`);
    const predictions = payload?.predictions || [];
    return predictions.length ? predictions[0] : null;
  } catch (error) {
    if (error?.status === 404) {
      return null;
    }
    throw error;
  }
}

export async function fetchPredictionHistory(patientId) {
  const payload = await request(`/predictions/history/${patientId}`);
  return Array.isArray(payload?.predictions) ? payload.predictions : [];
}

export async function overridePrediction(predictionId, { newTier, reason } = {}) {
  const payload = await request(`/predictions/${predictionId}/override`, {
    method: 'POST',
    body: {
      newTier,
      reason
    }
  });

  return payload?.prediction || null;
}

export async function fetchAuditLogs({ limit = 100, offset = 0 } = {}) {
  const query = new URLSearchParams();
  if (limit !== undefined && limit !== null) {
    query.set('limit', String(limit));
  }
  if (offset !== undefined && offset !== null) {
    query.set('offset', String(offset));
  }

  const suffix = query.toString() ? `?${query.toString()}` : '';
  const payload = await request(`/audit${suffix}`);
  return payload?.logs || [];
}

export async function fetchAlerts(filters = {}) {
  const query = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      query.set(key, String(value));
    }
  });

  const suffix = query.toString() ? `?${query.toString()}` : '';
  const payload = await request(`/alerts${suffix}`);
  return payload?.alerts || [];
}

export async function acknowledgeAlert(alertId) {
  const payload = await request(`/alerts/${alertId}/acknowledge`, {
    method: 'PATCH',
    body: {}
  });

  return payload?.alert || null;
}

export async function resolveAlert(alertId, resolutionNote = '') {
  const payload = await request(`/alerts/${alertId}/resolve`, {
    method: 'PATCH',
    body: {
      resolutionNote: resolutionNote || undefined
    }
  });

  return payload?.alert || null;
}

export async function fetchBatchPredictions(patientIds = []) {
  if (!patientIds.length) return {};
  const payload = await request(`/predictions/batch`, { method: 'POST', body: { patientIds } });
  return payload?.predictions || {};
}
