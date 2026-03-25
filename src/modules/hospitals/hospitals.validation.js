const Joi = require('joi');

const createHospitalSchema = Joi.object({
  name: Joi.string().trim().min(2).max(255).required(),
  code: Joi.string().trim().uppercase().alphanum().min(2).max(50).required(),
  slug: Joi.string().trim().lowercase().pattern(/^[a-z0-9-]+$/).min(2).max(100).required(),
  registrationNumber: Joi.string().trim().optional(),
  gstNumber: Joi.string().trim().optional(),
  address: Joi.string().trim().required(),
  city: Joi.string().trim().required(),
  state: Joi.string().trim().required(),
  country: Joi.string().trim().default('India'),
  pincode: Joi.string().trim().optional(),
  phone: Joi.string().trim().optional(),
  email: Joi.string().email().lowercase().optional(),
  website: Joi.string().uri().optional(),
  timezone: Joi.string().default('Asia/Kolkata'),
  currency: Joi.string().length(3).uppercase().default('INR'),
  subscriptionPlan: Joi.string().valid('TRIAL', 'STARTER', 'PROFESSIONAL', 'ENTERPRISE').default('TRIAL'),
  subscriptionExpiresAt: Joi.date().iso().optional(),
});

const updateHospitalSchema = Joi.object({
  name: Joi.string().trim().min(2).max(255),
  registrationNumber: Joi.string().trim().allow(''),
  gstNumber: Joi.string().trim().allow(''),
  address: Joi.string().trim(),
  city: Joi.string().trim(),
  state: Joi.string().trim(),
  country: Joi.string().trim(),
  pincode: Joi.string().trim().allow(''),
  phone: Joi.string().trim().allow(''),
  email: Joi.string().email().lowercase().allow(''),
  website: Joi.string().uri().allow(''),
  timezone: Joi.string(),
  settings: Joi.object(),
  isActive: Joi.boolean(),
  subscriptionPlan: Joi.string().valid('TRIAL', 'STARTER', 'PROFESSIONAL', 'ENTERPRISE'),
  subscriptionExpiresAt: Joi.date().iso().allow(null),
}).min(1);

module.exports = { createHospitalSchema, updateHospitalSchema };
