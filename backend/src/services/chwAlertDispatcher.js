const { sendSmsMessage } = require('./smsGateway');
const { createAuditLog } = require('../data');
const { prisma } = require('../lib/prisma');
const logger = require('../utils/logger');

// Retrieve CHW from DB or fallback memory users
async function getChwForPatient(patientId, facilityId) {
  // Try Prisma first
  if (prisma) {
    try {
      const patient = await prisma.patient.findUnique({
        where: { id: patientId },
        select: { facilityId: true }
      });
      const targetFacilityId = facilityId || patient?.facilityId;
      
      if (targetFacilityId) {
        const chws = await prisma.user.findMany({
          where: {
            role: 'chw',
            facilityId: targetFacilityId
          }
        });
        if (chws.length > 0) return chws[0];
      }
    } catch (err) {
      logger.debug(`Prisma lookup failed for CHW: ${err.message}`);
    }
  }

  // Fallback to memory store if Prisma fails or is absent
  try {
    const { users, patients } = require('../data');
    const patient = patients.find(p => p.id === patientId);
    const targetFacilityId = facilityId || patient?.facilityId;
    if (targetFacilityId) {
      return users.find(u => u.role === 'chw' && u.facilityId === targetFacilityId) || null;
    }
  } catch (err) {
    logger.debug(`Memory store lookup failed for CHW: ${err.message}`);
  }

  return null;
}

/**
 * Dispatches an SMS alert to the Community Health Worker (CHW) assigned
 * to the patient's facility/ward when they are discharged with high risk.
 */
async function dispatchChwAlert(req, { patient, prediction, facilityId, alertId }) {
  if (process.env.ALERT_SMS_ENABLED !== 'true') {
    return {
      type: 'chw_sms',
      target: null,
      provider: 'disabled',
      status: 'skipped'
    };
  }

  try {
    const chw = await getChwForPatient(patient.id, facilityId);
    if (!chw || !chw.phone && !process.env.DEFAULT_CHW_PHONE) {
      logger.info(`CHW Alert skipped: No CHW found or no phone number for patient ${patient.id}`);
      return {
        type: 'chw_sms',
        target: null,
        provider: 'skipped',
        status: 'skipped_missing_target'
      };
    }

    // Standardize phone
    const chwPhone = chw.phone || process.env.DEFAULT_CHW_PHONE || '+255700000000';
    const message = `TRIP Alert: High risk discharge. Please schedule immediate follow up for patient ${patient.name || patient.id} (Score: ${prediction.score}).`;

    logger.info(`Dispatching CHW SMS alert for patient ${patient.id} to ${chwPhone}`);
    
    const result = await sendSmsMessage({
      to: chwPhone,
      message
    });

    const channelPayload = {
      type: 'chw_sms',
      target: result.target,
      provider: result.provider,
      status: result.status,
      attemptedAt: new Date().toISOString()
    };

    if (alertId) {
      await createAuditLog({
        userId: req?.user?.id || null,
        userRole: req?.user?.role || null,
        facilityId: patient.facilityId || facilityId,
        ipAddress: req?.ip,
        action: 'risk_alert_sms_delivery_chw',
        resource: `alert:${alertId}`,
        details: {
          alertId,
          patientId: patient.id,
          target: channelPayload.target,
          status: channelPayload.status,
          provider: channelPayload.provider
        }
      });
    }

    return channelPayload;
  } catch (error) {
    logger.error(`Error in CHW alert dispatch: ${error.message}`);
    return {
      type: 'chw_sms',
      target: null,
      provider: 'error',
      status: 'failed',
      error: error.message
    };
  }
}

module.exports = {
  dispatchChwAlert,
  getChwForPatient
};
