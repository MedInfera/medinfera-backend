const { z } = require('zod');

const createDoctorSchema = z.object({
  // User account details
  first_name: z.string().min(2),
  last_name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  phone: z.string().min(10),
  // Doctor professional details
  registration_number: z.string().min(3, 'Registration number required'),
  specialization: z.string().min(2, 'Specialization required'),
  qualification: z.string().min(2, 'Qualification required'),
  experience_years: z.number().min(0).max(60).optional(),
  consultation_fee: z.number().min(0).default(0),
  followup_fee: z.number().min(0).optional(),
  slot_duration: z.number().int().min(5).max(60).default(15),
  max_appointments_per_day: z.number().int().min(1).max(100).default(20),
  is_online_available: z.boolean().default(true),
  meeting_provider: z.enum(['ZOOM', 'GOOGLE_MEET']).default('GOOGLE_MEET'),
});

const updateDoctorSchema = createDoctorSchema.partial();

const scheduleSchema = z.object({
  schedules: z.array(z.object({
    day_of_week: z.number().int().min(0).max(6),
    start_time: z.string().regex(/^\d{2}:\d{2}$/, 'Format must be HH:MM'),
    end_time: z.string().regex(/^\d{2}:\d{2}$/, 'Format must be HH:MM'),
    break_start_time: z.string().regex(/^\d{2}:\d{2}$/).optional(),
    break_end_time: z.string().regex(/^\d{2}:\d{2}$/).optional(),
    is_active: z.boolean().default(true),
  }))
});

module.exports = { createDoctorSchema, updateDoctorSchema, scheduleSchema };