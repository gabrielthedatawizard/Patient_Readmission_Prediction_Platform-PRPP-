const { createAuditLog } = require('../data');

async function logAudit(req, payload) {
  return createAuditLog({
    userId: req.user?.id || null,
    userRole: req.user?.role || null,
    facilityId: req.user?.facilityId || payload.facilityId || null,
    regionCode: req.user?.regionCode || payload.regionCode || null,
    ipAddress: req.ip,
    action: payload.action,
    resource: payload.resource,
    details: payload.details || null
  });
}

module.exports = {
  logAudit
};
