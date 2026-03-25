const Joi = require('joi');

const createPrescriptionSchema = Joi.object({
  patientId: Joi.string().uuid().required(),
  appointmentId: Joi.string().uuid().optional(),
  admissionId: Joi.string().uuid().optional(),
  validUntil: Joi.date().iso().optional(),
  notes: Joi.string().trim().optional().allow(''),
  items: Joi.array().items(Joi.object({
    medicineId: Joi.string().uuid().required(),
    dosage: Joi.string().trim().required(),
    frequency: Joi.string().trim().required(),
    route: Joi.string().trim().optional().allow(''),
    durationDays: Joi.number().integer().min(1).optional(),
    instructions: Joi.string().trim().optional().allow(''),
    quantityPrescribed: Joi.number().integer().min(1).required(),
    isSubstituteAllowed: Joi.boolean().default(false),
  })).min(1).required(),
});

const dispenseSchema = Joi.object({
  prescriptionId: Joi.string().uuid().required(),
  notes: Joi.string().trim().optional().allow(''),
  items: Joi.array().items(Joi.object({
    prescriptionItemId: Joi.string().uuid().required(),
    medicineId: Joi.string().uuid().required(),
    batchId: Joi.string().uuid().required(),
    quantity: Joi.number().integer().min(1).required(),
  })).min(1).required(),
});

module.exports = { createPrescriptionSchema, dispenseSchema };
