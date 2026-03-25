const Joi = require('joi');

const createAmbulanceSchema = Joi.object({
  vehicleNumber: Joi.string().trim().uppercase().required(),
  type: Joi.string()
    .valid('BASIC', 'ADVANCED_LIFE_SUPPORT', 'ICU_MOBILE', 'MORTUARY', 'NEONATAL')
    .default('BASIC'),
  driverId: Joi.string().uuid().optional(),
  equipmentList: Joi.array().items(Joi.string()).default([]),
  registrationExpiry: Joi.date().iso().optional(),
  insuranceExpiry: Joi.date().iso().optional(),
  fitnessExpiry: Joi.date().iso().optional(),
});

const updateAmbulanceSchema = createAmbulanceSchema
  .fork(['vehicleNumber'], s => s.optional()).min(1);

const dispatchSchema = Joi.object({
  ambulanceId: Joi.string().uuid().required(),
  patientId: Joi.string().uuid().optional(),
  pickupAddress: Joi.string().trim().required(),
  pickupLat: Joi.number().optional(),
  pickupLng: Joi.number().optional(),
  destination: Joi.string().trim().optional().allow(''),
  callerName: Joi.string().trim().optional().allow(''),
  callerPhone: Joi.string().trim().optional().allow(''),
  notes: Joi.string().trim().optional().allow(''),
});

const updateDispatchStatusSchema = Joi.object({
  status: Joi.string()
    .valid('DISPATCHED', 'ARRIVED_AT_SCENE', 'PATIENT_PICKED', 'COMPLETED', 'CANCELLED')
    .required(),
  notes: Joi.string().trim().optional().allow(''),
});

const locationSchema = Joi.object({
  latitude: Joi.number().min(-90).max(90).required(),
  longitude: Joi.number().min(-180).max(180).required(),
  speedKmh: Joi.number().min(0).optional(),
  dispatchId: Joi.string().uuid().optional(),
});

module.exports = {
  createAmbulanceSchema,
  updateAmbulanceSchema,
  dispatchSchema,
  updateDispatchStatusSchema,
  locationSchema,
};
