// Validation rules for hospital creation and updates
const { z } = require('zod');

const createHospitalSchema = z.object({
  name: z.string().min(3, 'Hospital name must be at least 3 characters'),
  email: z.string().email('Invalid email'),
  phone: z.string().min(10, 'Invalid phone number'),
  address_line1: z.string().min(5, 'Address is required'),
  address_line2: z.string().optional(),
  city: z.string().min(2, 'City is required'),
  state: z.string().min(2, 'State is required'),
  postal_code: z.string().min(4, 'Postal code is required'),
  country: z.string().optional().default('India'),
  registration_number: z.string().optional(),
  subscription_plan: z.enum(['BASIC', 'PROFESSIONAL', 'ENTERPRISE']).default('BASIC'),
  timezone: z.string().optional().default('Asia/Kolkata'),
  currency: z.string().optional().default('INR'),
});

const updateHospitalSchema = createHospitalSchema.partial();

module.exports = { createHospitalSchema, updateHospitalSchema };