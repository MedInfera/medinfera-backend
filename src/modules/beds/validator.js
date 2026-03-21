const { z } = require('zod');

const createBuildingSchema = z.object({
  name: z.string().min(2),
  code: z.string().optional(),
  total_floors: z.number().int().positive().optional(),
});

const createFloorSchema = z.object({
  building_id: z.number().int().positive(),
  floor_number: z.number().int(),
  name: z.string().optional(),
});

const createWardSchema = z.object({
  floor_id: z.number().int().positive(),
  name: z.string().min(2),
  ward_type: z.enum(['GENERAL','ICU','CCU','NICU','PICU','PRIVATE','DELUXE']),
  total_beds: z.number().int().min(1),
});

const createBedSchema = z.object({
  ward_id: z.number().int().positive(),
  bed_number: z.string().min(1),
  bed_type: z.enum(['GENERAL','ICU','VENTILATOR','MONITORED']),
  has_oxygen: z.boolean().default(false),
  has_suction: z.boolean().default(false),
  has_monitor: z.boolean().default(false),
  has_ventilator: z.boolean().default(false),
  daily_charge: z.number().min(0).default(0),
});

const admitPatientSchema = z.object({
  bed_id: z.number().int().positive(),
  patient_id: z.number().int().positive(),
  admitting_doctor_id: z.number().int().positive(),
  admission_datetime: z.string(),
  expected_discharge_datetime: z.string().optional(),
  primary_diagnosis: z.string().min(3),
  treatment_plan: z.string().optional(),
  daily_charge_applicable: z.number().min(0),
  notes: z.string().optional(),
});

const transferBedSchema = z.object({
  new_bed_id: z.number().int().positive(),
  transfer_reason: z.string().min(3),
});

module.exports = {
  createBuildingSchema, createFloorSchema, createWardSchema,
  createBedSchema, admitPatientSchema, transferBedSchema
};