const Joi = require('joi');

const createNotificationSchema = Joi.object({
  userId: Joi.string().uuid().required(),
  type: Joi.string()
    .valid(
      'APPOINTMENT_REMINDER', 'APPOINTMENT_UPDATE', 'LAB_RESULT_READY',
      'MEDICINE_LOW_STOCK', 'MEDICINE_EXPIRY', 'INVOICE_GENERATED',
      'PAYMENT_RECEIVED', 'BED_RELEASED', 'AMBULANCE_UPDATE', 'GENERAL', 'SYSTEM_ALERT'
    ).required(),
  title: Joi.string().trim().max(255).required(),
  message: Joi.string().trim().required(),
  entityType: Joi.string().trim().optional().allow(''),
  entityId: Joi.string().uuid().optional(),
  metadata: Joi.object().optional(),
});

module.exports = { createNotificationSchema };
