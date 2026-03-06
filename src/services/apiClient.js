const API_BASE = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '');
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
  return getAnyStorageValue(TOKEN_KEY);
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

function persistSession({ accessToken, user }, rememberMe = true) {
  const storage = getStorageFromRememberMe(rememberMe);

  if (!storage) {
    return;
  }

  // Keep only one active persistence location.
  clearSession();
  try {
    storage.setItem(TOKEN_KEY, accessToken);
    storage.setItem(USER_KEY, JSON.stringify(user));
  } catch (error) {
    // Storage write failures should not crash authentication flow.
  }
}

async function request(path, { method = 'GET', body, token } = {}) {
  const headers = {
    Accept: 'application/json'
  };

  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined
  });

  const text = await response.text();
  const payload = text ? safeParseJson(text) : null;

  if (!response.ok) {
    const message = parseErrorMessage(payload) || `Request failed with status ${response.status}`;
    const error = new Error(message);
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  return payload;
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
    body: { email, password }
  });

  const session = {
    accessToken: payload.accessToken,
    user: {
      ...payload.user,
      role: normalizeRoleForUi(payload.user?.role)
    }
  };

  persistSession(session, rememberMe);
  return session;
}

export async function fetchCurrentUser() {
  const token = getStoredToken();
  if (!token) {
    throw new Error('No active session token found.');
  }

  const payload = await request('/auth/me', { token });
  const sessionUser = {
    ...payload.user,
    role: normalizeRoleForUi(payload.user?.role)
  };

  let keepLocal = false;
  if (isBrowser()) {
    try {
      keepLocal = Boolean(window.localStorage.getItem(TOKEN_KEY));
    } catch (error) {
      keepLocal = false;
    }
  }
  persistSession(
    {
      accessToken: token,
      user: sessionUser
    },
    keepLocal
  );

  return sessionUser;
}

export async function logout() {
  const token = getStoredToken();

  if (token) {
    try {
      await request('/auth/logout', { method: 'POST', token });
    } catch (error) {
      // Logout endpoint failure should not block local session cleanup.
    }
  }

  clearSession();
}

export async function fetchPatients(filters = {}) {
  const token = getStoredToken();
  if (!token) {
    throw new Error('Missing session token.');
  }

  const query = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      query.set(key, String(value));
    }
  });

  const suffix = query.toString() ? `?${query.toString()}` : '';
  const payload = await request(`/patients${suffix}`, { token });
  return payload?.patients || [];
}

export async function fetchTasks(filters = {}) {
  const token = getStoredToken();
  if (!token) {
    throw new Error('Missing session token.');
  }

  const query = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      query.set(key, String(value));
    }
  });

  const suffix = query.toString() ? `?${query.toString()}` : '';
  const payload = await request(`/tasks${suffix}`, { token });
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
  const token = getStoredToken();
  if (!token) {
    throw new Error('Missing session token.');
  }

  const payload = await request(`/tasks/${taskId}`, {
    method: 'PATCH',
    token,
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
  const token = getStoredToken();
  if (!token) {
    throw new Error('Missing session token.');
  }

  try {
    const payload = await request(`/predictions/results/${patientId}`, { token });
    const predictions = payload?.predictions || [];
    return predictions.length ? predictions[0] : null;
  } catch (error) {
    if (error?.status === 404) {
      return null;
    }
    throw error;
  }
}

export async function fetchAuditLogs({ limit = 100, offset = 0 } = {}) {
  const token = getStoredToken();
  if (!token) {
    throw new Error('Missing session token.');
  }

  const query = new URLSearchParams();
  if (limit !== undefined && limit !== null) {
    query.set('limit', String(limit));
  }
  if (offset !== undefined && offset !== null) {
    query.set('offset', String(offset));
  }

  const suffix = query.toString() ? `?${query.toString()}` : '';
  const payload = await request(`/audit${suffix}`, { token });
  return payload?.logs || [];
}

export async function fetchAlerts(filters = {}) {
  const token = getStoredToken();
  if (!token) {
    throw new Error('Missing session token.');
  }

  const query = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      query.set(key, String(value));
    }
  });

  const suffix = query.toString() ? `?${query.toString()}` : '';
  const payload = await request(`/alerts${suffix}`, { token });
  return payload?.alerts || [];
}

export async function acknowledgeAlert(alertId) {
  const token = getStoredToken();
  if (!token) {
    throw new Error('Missing session token.');
  }

  const payload = await request(`/alerts/${alertId}/acknowledge`, {
    method: 'PATCH',
    token,
    body: {}
  });

  return payload?.alert || null;
}

export async function resolveAlert(alertId, resolutionNote = '') {
  const token = getStoredToken();
  if (!token) {
    throw new Error('Missing session token.');
  }

  const payload = await request(`/alerts/${alertId}/resolve`, {
    method: 'PATCH',
    token,
    body: {
      resolutionNote: resolutionNote || undefined
    }
  });

  return payload?.alert || null;
}
