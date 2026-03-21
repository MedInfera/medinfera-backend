const { z } = require('zod');

const bookAppointmentSchema = z.object({
  patient_id: z.number().int().positive(),
  doctor_id: z.number().int().positive(),
  appointment_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  start_time: z.string().regex(/^\d{2}:\d{2}$/),
  appointment_type: z.enum(['ONLINE', 'OFFLINE']),
  chief_complaint: z.string().min(3).optional(),
  symptoms: z.array(z.string()).default([]),
  is_followup: z.boolean().default(false),
  followup_from: z.number().int().positive().optional(),
});

const updateStatusSchema = z.object({
  status: z.enum(['CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW']),
  cancelled_reason: z.string().optional(),
  consultation_notes: z.string().optional(),
});

module.exports = { bookAppointmentSchema, updateStatusSchema };