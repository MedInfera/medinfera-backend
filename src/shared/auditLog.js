// Write to audit_logs table whenever important data changes
// Call this after any create/update/delete on critical entities
const { query } = require('../config/db');

const writeAuditLog = async ({ hospitalId, userId, action, entityType, entityId, oldData, newData, ipAddress }) => {
  try {
    await query(
      `INSERT INTO public.audit_logs 
        (hospital_id, user_id, action, entity_type, entity_id, old_data, new_data, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [hospitalId, userId, action, entityType, entityId,
        oldData ? JSON.stringify(oldData) : null,
        newData ? JSON.stringify(newData) : null,
        ipAddress || null]
    );
  } catch (err) {
    // Audit log failure should never crash the main request
    console.error('Audit log error:', err.message);
  }
};

module.exports = { writeAuditLog };