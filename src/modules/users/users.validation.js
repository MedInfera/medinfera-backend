const Joi = require('joi');

const ROLES = ['SUPER_ADMIN','ADMIN','DOCTOR','RECEPTIONIST','NURSE','PHARMACIST','LAB_TECHNICIAN','BILLING','PATIENT','DRIVER','STAFF'];

const createUserSchema = Joi.object({
  email: Joi.string().email().lowercase().trim().required(),
  phone: Joi.string().trim().optional().allow(''),
  password: Joi.string().min(8).required(),
  role: Joi.string().valid(...ROLES).required(),
  firstName: Joi.string().trim().max(100).required(),
  lastName: Joi.string().trim().max(100).required(),
  employeeCode: Joi.string().trim().optional().allow(''),
  department: Joi.string().trim().optional().allow(''),
  hospitalId: Joi.string().uuid().optional(),
});

const updateUserSchema = Joi.object({
  phone: Joi.string().trim().allow(''),
  firstName: Joi.string().trim().max(100),
  lastName: Joi.string().trim().max(100),
  employeeCode: Joi.string().trim().allow(''),
  department: Joi.string().trim().allow(''),
  avatarUrl: Joi.string().uri().allow(''),
  isActive: Joi.boolean(),
  mustResetPassword: Joi.boolean(),
}).min(1);

const resetPasswordSchema = Joi.object({
  newPassword: Joi.string().min(8).required(),
  mustResetPassword: Joi.boolean().default(true),
});

module.exports = { createUserSchema, updateUserSchema, resetPasswordSchema };
