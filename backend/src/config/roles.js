const ROLE_PERMISSIONS = {
  moh: ['*'],
  rhmt: ['patients:read', 'predictions:read', 'predictions:generate', 'tasks:read', 'analytics:read', 'audit:read', 'sync:pull'],
  chmt: ['patients:read', 'predictions:read', 'predictions:generate', 'tasks:read', 'analytics:read', 'sync:pull'],
  facility_manager: ['patients:read', 'patients:write', 'predictions:read', 'predictions:generate', 'tasks:read', 'tasks:write', 'analytics:read', 'sync:pull', 'sync:push'],
  clinician: ['patients:read', 'patients:write', 'predictions:read', 'predictions:generate', 'predictions:override', 'tasks:read', 'tasks:write', 'sync:pull', 'sync:push'],
  nurse: ['patients:read', 'predictions:read', 'tasks:read', 'tasks:write', 'sync:pull', 'sync:push'],
  pharmacist: ['patients:read', 'predictions:read', 'tasks:read', 'tasks:write', 'sync:pull', 'sync:push'],
  hro: ['patients:read', 'patients:write', 'tasks:read', 'analytics:read', 'sync:pull', 'sync:push'],
  chw: ['patients:read', 'tasks:read', 'tasks:write', 'sync:pull', 'sync:push'],
  ml_engineer: ['patients:read', 'predictions:read', 'predictions:generate', 'tasks:read', 'analytics:read', 'audit:read', 'sync:pull']
};

const ROLES = Object.keys(ROLE_PERMISSIONS);

function hasPermission(role, permission) {
  const permissions = ROLE_PERMISSIONS[role] || [];
  return permissions.includes('*') || permissions.includes(permission);
}

module.exports = {
  ROLE_PERMISSIONS,
  ROLES,
  hasPermission
};
