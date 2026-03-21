const { z } = require('zod');

const createMedicineSchema = z.object({
  brand_name: z.string().min(2, 'Brand name required'),
  generic_name: z.string().min(2, 'Generic name required'),
  strength: z.string().min(1, 'Strength required'),
  form: z.enum(['TABLET', 'CAPSULE', 'SYRUP', 'INJECTION', 'CREAM', 'DROPS', 'INHALER']),
  category: z.string().optional(),
  schedule: z.enum(['GENERAL', 'SCHEDULE_H', 'SCHEDULE_X', 'NARCOTIC']).default('GENERAL'),
  manufacturer: z.string().optional(),
  contraindications: z.array(z.string()).default([]),
  side_effects: z.array(z.string()).default([]),
  drug_interactions: z.array(z.string()).default([]),
  pregnancy_category: z.string().optional(),
});

const createBatchSchema = z.object({
  medicine_id: z.number().int().positive(),
  batch_number: z.string().min(1),
  manufacturing_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  expiry_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  quantity_total: z.number().int().positive(),
  purchase_price_per_unit: z.number().positive(),
  selling_price_per_unit: z.number().positive(),
  mrp: z.number().positive(),
  storage_location: z.string().optional(),
  rack_number: z.string().optional(),
  received_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  supplier_id: z.number().int().positive().optional(),
});

module.exports = { createMedicineSchema, createBatchSchema };