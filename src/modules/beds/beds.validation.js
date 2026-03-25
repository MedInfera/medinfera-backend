const Joi = require('joi');

const createWardSchema = Joi.object({
  name: Joi.string().trim().required(),
  wardType: Joi.string()
    .valid('GENERAL','SURGICAL','PEDIATRIC','MATERNITY','ORTHOPEDIC','CARDIAC','NEUROLOGY','ONCOLOGY','ICU','EMERGENCY','OTHER')
    .required(),
  floor: Joi.string().trim().optional().allow(''),
  inchargeId: Joi.string().uuid().optional(),
  description: Joi.string().trim().optional().allow(''),
});

const updateWardSchema = createWardSchema.fork(
  ['name', 'wardType'], s => s.optional()
).min(1);

const createBedSchema = Joi.object({
  wardId: Joi.string().uuid().required(),
  bedNumber: Joi.string().trim().required(),
  bedType: Joi.string()
    .valid('GENERAL','PRIVATE','SEMI_PRIVATE','ICU','HDU','NICU','PICU','ISOLATION')
    .default('GENERAL'),
  dailyRate: Joi.number().min(0).default(0),
  notes: Joi.string().trim().optional().allow(''),
});

const updateBedSchema = createBedSchema
  .fork(['wardId', 'bedNumber'], s => s.optional()).min(1);

const updateBedStatusSchema = Joi.object({
  status: Joi.string()
    .valid('AVAILABLE','OCCUPIED','RESERVED','MAINTENANCE','BLOCKED')
    .required(),
});

module.exports = {
  createWardSchema,
  updateWardSchema,
  createBedSchema,
  updateBedSchema,
  updateBedStatusSchema,
};
