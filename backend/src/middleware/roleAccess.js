const { canAccessRoleFeature } = require('../config/roleAccess');

function requireRoleFeature(feature, message) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required before authorization.'
      });
    }

    if (!canAccessRoleFeature(req.user, feature)) {
      return res.status(403).json({
        error: 'Forbidden',
        message:
          message || `Role ${req.user.role} cannot access ${feature} in this workspace.`
      });
    }

    return next();
  };
}

module.exports = {
  requireRoleFeature
};
