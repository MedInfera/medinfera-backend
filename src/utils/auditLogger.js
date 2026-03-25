const prisma = require('../config/database');
const logger = require('../config/logger');

/**
 * Create an immutable audit log entry
 */
const audit = async ({ hospitalId, userId, action, entityType, entityId, oldValues, newValues, req }) => {
  try {
    await prisma.auditLog.create({
      data: {
        hospitalId: hospitalId || null,
        userId: userId || null,
        action,
        entityType,
        entityId: entityId || null,
        oldValues: oldValues || undefined,
        newValues: newValues || undefined,
        ipAddress: req?.ip || null,
        userAgent: req?.headers?.['user-agent'] || null,
        metadata: {},
      },
    });
  } catch (err) {
    // Audit logging must never crash the main flow
    logger.error('Audit log failed:', err);
  }
};

module.exports = { audit };
