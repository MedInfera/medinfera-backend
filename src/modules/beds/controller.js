const bedService = require('./service');
const {
  createBuildingSchema, createFloorSchema, createWardSchema,
  createBedSchema, admitPatientSchema
} = require('./validator');
const { success } = require('../../shared/response');

const createBuilding = async (req, res, next) => {
  try {
    const data = createBuildingSchema.parse(req.body);
    const building = await bedService.createBuilding(req.hospitalId, data);
    return success(res, building, 'Building created', 201);
  } catch (err) { next(err); }
};

const getBuildings = async (req, res, next) => {
  try {
    const buildings = await bedService.getBuildings(req.hospitalId);
    return success(res, buildings, 'Buildings fetched');
  } catch (err) { next(err); }
};

const createFloor = async (req, res, next) => {
  try {
    const data = createFloorSchema.parse(req.body);
    const floor = await bedService.createFloor(data);
    return success(res, floor, 'Floor created', 201);
  } catch (err) { next(err); }
};

const createWard = async (req, res, next) => {
  try {
    const data = createWardSchema.parse(req.body);
    const ward = await bedService.createWard(data);
    return success(res, ward, 'Ward created', 201);
  } catch (err) { next(err); }
};

const createBed = async (req, res, next) => {
  try {
    const data = createBedSchema.parse(req.body);
    const bed = await bedService.createBed(data);
    return success(res, bed, 'Bed created', 201);
  } catch (err) { next(err); }
};

const getDashboard = async (req, res, next) => {
  try {
    const dashboard = await bedService.getBedDashboard(req.hospitalId);
    return success(res, dashboard, 'Bed dashboard fetched');
  } catch (err) { next(err); }
};

const getAvailableBeds = async (req, res, next) => {
  try {
    const beds = await bedService.getAvailableBeds(req.hospitalId, req.query.ward_id);
    return success(res, beds, 'Available beds fetched');
  } catch (err) { next(err); }
};

const admitPatient = async (req, res, next) => {
  try {
    const data = admitPatientSchema.parse(req.body);
    const allocation = await bedService.admitPatient(req.hospitalId, data, req.user.id);
    return success(res, allocation, 'Patient admitted successfully', 201);
  } catch (err) { next(err); }
};

const dischargePatient = async (req, res, next) => {
  try {
    const result = await bedService.dischargePatient(
      req.params.allocationId, req.hospitalId, req.user.id
    );
    return success(res, result, 'Patient discharged successfully');
  } catch (err) { next(err); }
};

const markAvailable = async (req, res, next) => {
  try {
    const bed = await bedService.markBedAvailable(req.params.bedId, req.hospitalId);
    return success(res, bed, 'Bed marked as available');
  } catch (err) { next(err); }
};

module.exports = {
  createBuilding, getBuildings, createFloor, createWard,
  createBed, getDashboard, getAvailableBeds,
  admitPatient, dischargePatient, markAvailable
};