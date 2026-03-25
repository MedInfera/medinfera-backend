const Joi = require('joi');

const createDoctorProfileSchema = Joi.object({
  userId: Joi.string().uuid().required(),
  specialization: Joi.string().trim().required(),
  qualification: Joi.string().trim().optional().allow(''),
  licenseNumber: Joi.string().trim().optional().allow(''),
  experienceYears: Joi.number().integer().min(0).max(70).default(0),
  consultationFee: Joi.number().min(0).default(0),
  followUpFee: Joi.number().min(0).default(0),
  emergencyFee: Joi.number().min(0).default(0),
  maxDailyPatients: Joi.number().integer().min(1).max(200).default(30),
  biography: Joi.string().trim().optional().allow(''),
});

const updateDoctorProfileSchema = createDoctorProfileSchema
  .fork(['userId','specialization'], s => s.optional()).min(1);

const scheduleSchema = Joi.object({
  dayOfWeek: Joi.string().valid('MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY','SUNDAY').required(),
  startTime: Joi.string().pattern(/^([0-1]\d|2[0-3]):([0-5]\d)$/).required(),
  endTime: Joi.string().pattern(/^([0-1]\d|2[0-3]):([0-5]\d)$/).required(),
  slotDurationMinutes: Joi.number().integer().valid(10,15,20,30,45,60).default(15),
  maxSlots: Joi.number().integer().optional(),
  isActive: Joi.boolean().default(true),
});

const leaveSchema = Joi.object({
  leaveDate: Joi.date().iso().required(),
  reason: Joi.string().trim().optional().allow(''),
});

module.exports = { createDoctorProfileSchema, updateDoctorProfileSchema, scheduleSchema, leaveSchema };
