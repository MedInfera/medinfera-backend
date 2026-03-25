const Joi = require('joi');

const createMedicineSchema = Joi.object({
  name: Joi.string().trim().required(),
  genericName: Joi.string().trim().optional().allow(''),
  category: Joi.string()
    .valid('TABLET','CAPSULE','SYRUP','INJECTION','DROPS','CREAM','OINTMENT','INHALER','POWDER','PATCH','SUPPOSITORY','OTHER')
    .required(),
  hsnCode: Joi.string().trim().optional().allow(''),
  manufacturer: Joi.string().trim().optional().allow(''),
  unitOfMeasure: Joi.string().trim().default('strip'),
  reorderLevel: Joi.number().integer().min(0).default(10),
  gstRate: Joi.number().min(0).max(100).default(12),
  mrp: Joi.number().min(0).optional(),
  sellingPrice: Joi.number().min(0).required(),
  isControlled: Joi.boolean().default(false),
});

const updateMedicineSchema = createMedicineSchema
  .fork(['name', 'category', 'sellingPrice'], s => s.optional()).min(1);

const createSupplierSchema = Joi.object({
  name: Joi.string().trim().required(),
  contactPerson: Joi.string().trim().optional().allow(''),
  phone: Joi.string().trim().optional().allow(''),
  email: Joi.string().email().lowercase().optional().allow(''),
  address: Joi.string().trim().optional().allow(''),
  city: Joi.string().trim().optional().allow(''),
  state: Joi.string().trim().optional().allow(''),
  gstNumber: Joi.string().trim().optional().allow(''),
  drugLicense: Joi.string().trim().optional().allow(''),
  paymentTerms: Joi.number().integer().min(0).default(30),
  creditLimit: Joi.number().min(0).default(0),
});

const updateSupplierSchema = createSupplierSchema
  .fork(['name'], s => s.optional()).min(1);

const createPurchaseOrderSchema = Joi.object({
  supplierId: Joi.string().uuid().required(),
  expectedDeliveryAt: Joi.date().iso().optional(),
  notes: Joi.string().trim().optional().allow(''),
  items: Joi.array().items(
    Joi.object({
      medicineId: Joi.string().uuid().required(),
      quantityOrdered: Joi.number().integer().min(1).required(),
      unitPrice: Joi.number().min(0).required(),
      gstRate: Joi.number().min(0).max(100).default(12),
      batchNumber: Joi.string().trim().optional().allow(''),
      expiryDate: Joi.date().iso().optional(),
    })
  ).min(1).required(),
});

const receivePurchaseOrderSchema = Joi.object({
  notes: Joi.string().trim().optional().allow(''),
  items: Joi.array().items(
    Joi.object({
      itemId: Joi.string().uuid().required(),
      quantityReceived: Joi.number().integer().min(0).required(),
      batchNumber: Joi.string().trim().required(),
      expiryDate: Joi.date().iso().required(),
      manufactureDate: Joi.date().iso().optional(),
    })
  ).min(1).required(),
});

module.exports = {
  createMedicineSchema,
  updateMedicineSchema,
  createSupplierSchema,
  updateSupplierSchema,
  createPurchaseOrderSchema,
  receivePurchaseOrderSchema,
};
