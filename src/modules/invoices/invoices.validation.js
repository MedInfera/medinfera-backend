const Joi = require('joi');

const createInvoiceSchema = Joi.object({
  patientId: Joi.string().uuid().required(),
  type: Joi.string().valid('OPD','IPD','LAB','PHARMACY','AMBULANCE','PACKAGE','MISCELLANEOUS').required(),
  appointmentId: Joi.string().uuid().optional(),
  admissionId: Joi.string().uuid().optional(),
  discountAmount: Joi.number().min(0).default(0),
  discountReason: Joi.string().trim().optional().allow(''),
  dueDate: Joi.date().iso().optional(),
  notes: Joi.string().trim().optional().allow(''),
  items: Joi.array().items(Joi.object({
    itemType: Joi.string().valid('CONSULTATION','PROCEDURE','MEDICINE','LAB_TEST','BED_CHARGE','NURSING_CHARGE','AMBULANCE','SERVICE','PACKAGE','OTHER').required(),
    description: Joi.string().trim().required(),
    referenceId: Joi.string().uuid().optional(),
    quantity: Joi.number().integer().min(1).default(1),
    unitPrice: Joi.number().min(0).required(),
    discount: Joi.number().min(0).default(0),
    gstRate: Joi.number().min(0).max(100).default(0),
  })).min(1).required(),
});

const recordPaymentSchema = Joi.object({
  invoiceId: Joi.string().uuid().required(),
  paymentMode: Joi.string().valid('CASH','CARD','UPI','NETBANKING','CHEQUE','INSURANCE','CREDIT').required(),
  amount: Joi.number().min(0.01).required(),
  transactionReference: Joi.string().trim().optional().allow(''),
  notes: Joi.string().trim().optional().allow(''),
});

module.exports = { createInvoiceSchema, recordPaymentSchema };
