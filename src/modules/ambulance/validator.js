const { z } = require('zod');

const createAmbulanceSchema = z.object({
  vehicle_number: z.string().min(3),
  type: z.enum(['BLS','ALS','PATIENT_TRANSPORT','ICU_AMBULANCE']),
  has_ventilator: z.boolean().default(false),
  has_defibrillator: z.boolean().default(false),
  has_oxygen: z.boolean().default(false),
  make_model: z.string().optional(),
  year_of_manufacture: z.number().int().optional(),
  insurance_expiry: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  permit_expiry: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  base_charge: z.number().min(0),
  per_km_charge: z.number().min(0),
  waiting_charge_per_hour: z.number().min(0).default(0),
});

const createDriverSchema = z.object({
  first_name: z.string().min(2),
  last_name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  phone: z.string().min(10),
  license_number: z.string().min(5),
  license_expiry: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  experience_years: z.number().int().min(0).optional(),
});

const createTripSchema = z.object({
  ambulance_id: z.number().int().positive(),
  driver_id: z.number().int().positive(),
  patient_id: z.number().int().positive().optional(),
  request_type: z.enum(['EMERGENCY','TRANSFER','DISCHARGE']),
  pickup_location: z.string().min(3),
  pickup_latitude: z.number().optional(),
  pickup_longitude: z.number().optional(),
  destination_location: z.string().min(3),
  destination_latitude: z.number().optional(),
  destination_longitude: z.number().optional(),
  requested_by: z.string().optional(),
  notes: z.string().optional(),
});

const updateTripStatusSchema = z.object({
  status: z.enum(['DISPATCHED','ARRIVED','PICKED_UP','TRANSPORTING','COMPLETED','CANCELLED']),
  distance_km: z.number().min(0).optional(),
  waiting_minutes: z.number().int().min(0).optional(),
  notes: z.string().optional(),
});

module.exports = {
  createAmbulanceSchema, createDriverSchema,
  createTripSchema, updateTripStatusSchema
};