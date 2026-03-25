const Joi = require('joi');

const admitSchema = Joi.object({
  patientId: Joi.string().uuid().required(),
  primaryDoctorId: Joi.string().uuid().required(),
  bedId: Joi.string().uuid().required(),
  reasonForAdmission: Joi.string().trim().min(3).required(),
  provisionalDiagnosis: Joi.string().trim().optional().allow(''),
  expectedDischarge: Joi.date().iso().optional(),
  referredBy: Joi.string().trim().optional().allow(''),
});

const dischargeSchema = Joi.object({
  finalDiagnosis: Joi.string().trim().required(),
  treatmentSummary: Joi.string().trim().optional().allow(''),
  dischargeNotes: Joi.string().trim().optional().allow(''),
});

const transferBedSchema = Joi.object({
  toBedId: Joi.string().uuid().required(),
  reason: Joi.string().trim().optional().allow(''),
});

const addAttendingDoctorSchema = Joi.object({
  doctorId: Joi.string().uuid().required(),
});

const addNoteSchema = Joi.object({
  noteType: Joi.string()
    .valid('PROGRESS', 'NURSING', 'SURGICAL', 'REFERRAL', 'DISCHARGE', 'OTHER')
    .default('PROGRESS'),
  content: Joi.string().trim().min(1).required(),
});

const updateStatusSchema = Joi.object({
  status: Joi.string()
    .valid('ADMITTED', 'UNDER_TREATMENT', 'CRITICAL', 'STABLE', 'TRANSFERRED', 'ABSCONDED')
    .required(),
});

module.exports = {
  admitSchema,
  dischargeSchema,
  transferBedSchema,
  addAttendingDoctorSchema,
  addNoteSchema,
  updateStatusSchema,
};
