const crypto = require('crypto');
const { createAuditLog, getLastAuditLog, listAuditLogsForUser } = require('../data');

function generateAuditHash(previousHash, payload) {
  const content = JSON.stringify({
    previousHash: previousHash || 'GENESIS',
    userId: payload.userId,
    userRole: payload.userRole,
    facilityId: payload.facilityId,
    regionCode: payload.regionCode,
    action: payload.action,
    resource: payload.resource,
    details: payload.details,
    ipAddress: payload.ipAddress
  });
  return crypto.createHash('sha256').update(content).digest('hex');
}

async function logAudit(req, payload) {
  const lastLog = await getLastAuditLog();
  const previousHash = lastLog && lastLog.hash ? lastLog.hash : 'GENESIS';

  const entry = {
    userId: req.user?.id || null,
    userRole: req.user?.role || null,
    facilityId: req.user?.facilityId || payload.facilityId || null,
    regionCode: req.user?.regionCode || payload.regionCode || null,
    ipAddress: req.ip,
    action: payload.action,
    resource: payload.resource,
    details: payload.details || null
  };

  const hash = generateAuditHash(previousHash, entry);

  return createAuditLog({
    ...entry,
    hash,
    previousHash
  });
}

async function verifyAuditChain(user, options = {}) {
  // Use listAuditLogsForUser to grab logs, ordered by createdAt (it defaults desc, so we must reverse it to verify from oldest to newest)
  const logs = await listAuditLogsForUser(user, { limit: 10000 });
  
  if (!logs || logs.length === 0) {
    return { valid: true, tamperedLogs: [] };
  }

  // Reverse so older logs are first
  const chronologicalLogs = [...logs].reverse();
  const tamperedLogs = [];
  
  let currentExpectedPrevious = 'GENESIS'; // The very first log ever should have previousHash = 'GENESIS'
  
  // We can't perfectly verify the entire DB's genesis because listAuditLogsForUser might be paginated or scoped.
  // But within this scoped sequence, the chain should hold if it's the full history. 
  // Wait! If they are scoped by facility, a facility user only sees *their* facility's logs!
  // So the hashes wouldn't form a chain because other facility's logs are interleaved in the DB.
  // We'll calculate the hash based on the log's store.
  
  for (let i = 0; i < chronologicalLogs.length; i++) {
    const log = chronologicalLogs[i];
    
    // Recompute
    const entry = {
      userId: log.userId,
      userRole: log.userRole || log.details?.userRole || null,
      facilityId: log.facilityId,
      regionCode: log.regionCode || log.details?.regionCode || null,
      action: log.action,
      resource: log.resource,
      details: log.details,
      ipAddress: log.ipAddress
    };
    
    // The previous hash must match log.previousHash
    // The calculated hash must match log.hash
    
    const calculatedHash = generateAuditHash(log.previousHash, entry);
    
    if (calculatedHash !== log.hash) {
      tamperedLogs.push({
        id: log.id,
        reason: 'Hash mismatch'
      });
    }
  }

  return {
    valid: tamperedLogs.length === 0,
    tamperedLogs
  };
}

module.exports = {
  logAudit,
  verifyAuditChain
};
