const ambulanceService = require('./service');
const {
  createAmbulanceSchema, createDriverSchema,
  createTripSchema, updateTripStatusSchema
} = require('./validator');
const { success } = require('../../shared/response');

const getAllAmbulances = async (req, res, next) => {
  try {
    const ambulances = await ambulanceService.getAllAmbulances(req.hospitalId);
    return success(res, ambulances, 'Ambulances fetched');
  } catch (err) { next(err); }
};

const createAmbulance = async (req, res, next) => {
  try {
    const data = createAmbulanceSchema.parse(req.body);
    const ambulance = await ambulanceService.createAmbulance(req.hospitalId, data);
    return success(res, ambulance, 'Ambulance created', 201);
  } catch (err) { next(err); }
};

const createDriver = async (req, res, next) => {
  try {
    const data = createDriverSchema.parse(req.body);
    const driver = await ambulanceService.createDriver(req.hospitalId, data, req.user.id);
    return success(res, driver, 'Driver created', 201);
  } catch (err) { next(err); }
};

const getAllDrivers = async (req, res, next) => {
  try {
    const drivers = await ambulanceService.getAllDrivers(req.hospitalId);
    return success(res, drivers, 'Drivers fetched');
  } catch (err) { next(err); }
};

const createTrip = async (req, res, next) => {
  try {
    const data = createTripSchema.parse(req.body);
    const trip = await ambulanceService.createTrip(req.hospitalId, data, req.user.id);
    return success(res, trip, 'Ambulance dispatched', 201);
  } catch (err) { next(err); }
};

const updateTripStatus = async (req, res, next) => {
  try {
    const data = updateTripStatusSchema.parse(req.body);
    const trip = await ambulanceService.updateTripStatus(
      req.params.id, req.hospitalId, data
    );
    return success(res, trip, `Trip ${data.status.toLowerCase()}`);
  } catch (err) { next(err); }
};

const getActiveTrips = async (req, res, next) => {
  try {
    const trips = await ambulanceService.getActiveTrips(req.hospitalId);
    return success(res, trips, 'Active trips fetched');
  } catch (err) { next(err); }
};

module.exports = {
  getAllAmbulances, createAmbulance, createDriver,
  getAllDrivers, createTrip, updateTripStatus, getActiveTrips
};