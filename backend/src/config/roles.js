const ROLE_PERMISSIONS = {
  moh: ['*'],
  rhmt: ['patients:read', 'predictions:read', 'predictions:generate', 'tasks:read', 'analytics:read', 'audit:read'],
  chmt: ['patients:read', 'predictions:read', 'predictions:generate', 'tasks:read', 'analytics:read'],
  facility_manager: ['patients:read', 'patients:write', 'predictions:read', 'predictions:generate', 'tasks:read', 'tasks:write', 'analytics:read'],
  clinician: ['patients:read', 'patients:write', 'predictions:read', 'predictions:generate', 'predictions:override', 'tasks:read', 'tasks:write'],
  nurse: ['patients:read', 'predictions:read', 'tasks:read', 'tasks:write'],
  pharmacist: ['patients:read', 'predictions:read', 'tasks:read', 'tasks:write'],
  hro: ['patients:read', 'patients:write', 'tasks:read'],
  chw: ['patients:read', 'tasks:read', 'tasks:write'],
  ml_engineer: ['patients:read', 'predictions:read', 'predictions:generate', 'analytics:read', 'audit:read']
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
