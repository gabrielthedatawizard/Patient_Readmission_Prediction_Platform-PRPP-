const { hasPermission } = require('../config/roles');

function requirePermission(permission) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required before authorization.'
      });
    }

    if (!hasPermission(req.user.role, permission)) {
      return res.status(403).json({
        error: 'Forbidden',
        message: `Role ${req.user.role} cannot perform ${permission}.`
      });
    }

    return next();
  };
}

module.exports = {
  requirePermission
};
