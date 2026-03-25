const Joi = require('joi');

const createPatientSchema = Joi.object({
  firstName: Joi.string().trim().max(100).required(),
  lastName: Joi.string().trim().max(100).required(),
  gender: Joi.string().valid('MALE', 'FEMALE', 'OTHER').required(),
  dateOfBirth: Joi.date().iso().max('now').optional(),
  bloodGroup: Joi.string().valid('A_POSITIVE','A_NEGATIVE','B_POSITIVE','B_NEGATIVE','AB_POSITIVE','AB_NEGATIVE','O_POSITIVE','O_NEGATIVE','UNKNOWN').default('UNKNOWN'),
  phone: Joi.string().trim().optional().allow(''),
  email: Joi.string().email().lowercase().optional().allow(''),
  address: Joi.string().trim().optional().allow(''),
  city: Joi.string().trim().optional().allow(''),
  state: Joi.string().trim().optional().allow(''),
  pincode: Joi.string().trim().optional().allow(''),
  allergies: Joi.array().items(Joi.string()).default([]),
  chronicConditions: Joi.array().items(Joi.string()).default([]),
  emergencyContactName: Joi.string().trim().optional().allow(''),
  emergencyContactPhone: Joi.string().trim().optional().allow(''),
  emergencyContactRelation: Joi.string().trim().optional().allow(''),
  insuranceProvider: Joi.string().trim().optional().allow(''),
  insurancePolicyNumber: Joi.string().trim().optional().allow(''),
  insuranceValidUntil: Joi.date().iso().optional(),
  notes: Joi.string().trim().optional().allow(''),
});

const updatePatientSchema = createPatientSchema.fork(
  ['firstName', 'lastName', 'gender'],
  (s) => s.optional()
).min(1);

const vitalSignSchema = Joi.object({
  admissionId: Joi.string().uuid().optional(),
  appointmentId: Joi.string().uuid().optional(),
  bpSystolic: Joi.number().integer().min(50).max(300).optional(),
  bpDiastolic: Joi.number().integer().min(30).max(200).optional(),
  heartRate: Joi.number().integer().min(20).max(300).optional(),
  temperatureCelsius: Joi.number().min(30).max(45).optional(),
  oxygenSaturation: Joi.number().min(50).max(100).optional(),
  respiratoryRate: Joi.number().integer().min(5).max(60).optional(),
  weightKg: Joi.number().min(1).max(500).optional(),
  heightCm: Joi.number().min(30).max(250).optional(),
  bloodGlucose: Joi.number().min(1).max(1000).optional(),
  painScale: Joi.number().integer().min(0).max(10).optional(),
  notes: Joi.string().trim().optional().allow(''),
});

module.exports = { createPatientSchema, updatePatientSchema, vitalSignSchema };
