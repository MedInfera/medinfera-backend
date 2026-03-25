const Joi = require('joi');

const createAppointmentSchema = Joi.object({
  patientId: Joi.string().uuid().required(),
  doctorId: Joi.string().uuid().required(),
  appointmentDate: Joi.date().iso().required(),
  appointmentTime: Joi.string().pattern(/^([0-1]\d|2[0-3]):([0-5]\d)$/).required(),
  type: Joi.string().valid('CONSULTATION','FOLLOW_UP','EMERGENCY','TELECONSULT').default('CONSULTATION'),
  chiefComplaint: Joi.string().trim().optional().allow(''),
  notes: Joi.string().trim().optional().allow(''),
  isFollowUp: Joi.boolean().default(false),
});

const updateAppointmentSchema = Joi.object({
  appointmentDate: Joi.date().iso(),
  appointmentTime: Joi.string().pattern(/^([0-1]\d|2[0-3]):([0-5]\d)$/),
  type: Joi.string().valid('CONSULTATION','FOLLOW_UP','EMERGENCY','TELECONSULT'),
  chiefComplaint: Joi.string().trim().allow(''),
  notes: Joi.string().trim().allow(''),
}).min(1);

const updateStatusSchema = Joi.object({
  status: Joi.string().valid(
    'SCHEDULED','CONFIRMED','IN_PROGRESS','COMPLETED','CANCELLED','NO_SHOW','RESCHEDULED'
  ).required(),
  doctorNotes: Joi.string().trim().optional().allow(''),
  cancellationReason: Joi.string().trim().optional().allow(''),
});

const rescheduleSchema = Joi.object({
  appointmentDate: Joi.date().iso().required(),
  appointmentTime: Joi.string().pattern(/^([0-1]\d|2[0-3]):([0-5]\d)$/).required(),
  reason: Joi.string().trim().optional().allow(''),
});

module.exports = { createAppointmentSchema, updateAppointmentSchema, updateStatusSchema, rescheduleSchema };
