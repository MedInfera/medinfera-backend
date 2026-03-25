const Joi = require('joi');

const createLabTestSchema = Joi.object({
  name: Joi.string().trim().required(),
  code: Joi.string().trim().optional().allow(''),
  category: Joi.string().trim().optional().allow(''),
  description: Joi.string().trim().optional().allow(''),
  normalRangeMale: Joi.string().trim().optional().allow(''),
  normalRangeFemale: Joi.string().trim().optional().allow(''),
  unit: Joi.string().trim().optional().allow(''),
  price: Joi.number().min(0).required(),
  gstRate: Joi.number().min(0).max(100).default(5),
  turnaroundHours: Joi.number().integer().min(1).default(24),
  sampleType: Joi.string().trim().optional().allow(''),
});

const updateLabTestSchema = createLabTestSchema
  .fork(['name', 'price'], s => s.optional()).min(1);

const createLabOrderSchema = Joi.object({
  patientId: Joi.string().uuid().required(),
  appointmentId: Joi.string().uuid().optional(),
  admissionId: Joi.string().uuid().optional(),
  priority: Joi.string().valid('ROUTINE', 'URGENT', 'STAT').default('ROUTINE'),
  clinicalInfo: Joi.string().trim().optional().allow(''),
  testIds: Joi.array().items(Joi.string().uuid()).min(1).required(),
});

const updateLabOrderStatusSchema = Joi.object({
  status: Joi.string()
    .valid('SAMPLE_COLLECTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'REJECTED')
    .required(),
});

const enterResultsSchema = Joi.object({
  results: Joi.array().items(
    Joi.object({
      itemId: Joi.string().uuid().required(),
      resultValue: Joi.string().trim().required(),
      resultNotes: Joi.string().trim().optional().allow(''),
      isAbnormal: Joi.boolean().optional(),
    })
  ).min(1).required(),
});

module.exports = {
  createLabTestSchema,
  updateLabTestSchema,
  createLabOrderSchema,
  updateLabOrderStatusSchema,
  enterResultsSchema,
};
