const Joi = require('joi');

const createPayrollSchema = Joi.object({
  userId: Joi.string().uuid().required(),
  month: Joi.number().integer().min(1).max(12).required(),
  year: Joi.number().integer().min(2020).max(2100).required(),
  basicSalary: Joi.number().min(0).required(),
  allowances: Joi.number().min(0).default(0),
  deductions: Joi.number().min(0).default(0),
  notes: Joi.string().trim().optional().allow(''),
});

const createPayoutSchema = Joi.object({
  userId: Joi.string().uuid().required(),
  payrollId: Joi.string().uuid().optional(),
  type: Joi.string()
    .valid('SALARY', 'ADVANCE', 'REIMBURSEMENT', 'BONUS', 'INCENTIVE', 'DEDUCTION')
    .required(),
  amount: Joi.number().min(0.01).required(),
  paymentMode: Joi.string()
    .valid('CASH', 'CARD', 'UPI', 'NETBANKING', 'CHEQUE')
    .optional(),
  referenceNumber: Joi.string().trim().optional().allow(''),
  notes: Joi.string().trim().optional().allow(''),
});

const markPaidSchema = Joi.object({
  paymentMode: Joi.string()
    .valid('CASH', 'CARD', 'UPI', 'NETBANKING', 'CHEQUE')
    .required(),
  referenceNumber: Joi.string().trim().optional().allow(''),
  notes: Joi.string().trim().optional().allow(''),
});

module.exports = { createPayrollSchema, createPayoutSchema, markPaidSchema };
