const { z } = require('zod');

const createPrescriptionSchema = z.object({
  appointment_id: z.number().int().positive(),
  patient_id: z.number().int().positive(),
  doctor_id: z.number().int().positive(),
  diagnosis: z.string().min(3, 'Diagnosis required'),
  subjective_findings: z.string().optional(),
  objective_findings: z.string().optional(),
  assessment: z.string().optional(),
  advice: z.string().optional(),
  followup_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  medicines: z.array(z.object({
    medicine_id: z.number().int().positive(),
    medicine_batch_id: z.number().int().positive().optional(),
    dosage: z.string().min(1),
    frequency: z.string().min(1),
    duration: z.string().min(1),
    route: z.string().default('ORAL'),
    instructions: z.string().optional(),
    quantity_prescribed: z.number().int().positive(),
  })).min(1, 'At least one medicine required'),
});

module.exports = { createPrescriptionSchema };