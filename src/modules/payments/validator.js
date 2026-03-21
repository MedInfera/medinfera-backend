const { z } = require('zod');

const createOrderSchema = z.object({
  appointment_id: z.number().int().positive().optional(),
  bed_allocation_id: z.number().int().positive().optional(),
  ambulance_trip_id: z.number().int().positive().optional(),
  patient_id: z.number().int().positive(),
  amount: z.number().positive(),
  payment_method: z.enum(['CASH', 'CARD', 'UPI', 'BANK_TRANSFER', 'INSURANCE']),
  notes: z.string().optional(),
});

const verifyPaymentSchema = z.object({
  razorpay_order_id: z.string(),
  razorpay_payment_id: z.string(),
  razorpay_signature: z.string(),
  payment_number: z.string(),
});

const cashPaymentSchema = z.object({
  appointment_id: z.number().int().positive().optional(),
  bed_allocation_id: z.number().int().positive().optional(),
  ambulance_trip_id: z.number().int().positive().optional(),
  patient_id: z.number().int().positive(),
  amount: z.number().positive(),
  discount_amount: z.number().min(0).default(0),
  notes: z.string().optional(),
});

module.exports = { createOrderSchema, verifyPaymentSchema, cashPaymentSchema };