const { z } = require('zod');

const createPatientSchema = z.object({
  // User account
  first_name: z.string().min(2),
  last_name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  phone: z.string().min(10),
  // Patient medical info
  date_of_birth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format must be YYYY-MM-DD'),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']),
  blood_group: z.enum(['A+','A-','B+','B-','AB+','AB-','O+','O-','UNKNOWN']).default('UNKNOWN'),
  allergies: z.array(z.string()).default([]),
  chronic_diseases: z.array(z.string()).default([]),
  emergency_contact_name: z.string().optional(),
  emergency_contact_phone: z.string().optional(),
  emergency_contact_relation: z.string().optional(),
});

const updatePatientSchema = createPatientSchema.partial();

module.exports = { createPatientSchema, updatePatientSchema };