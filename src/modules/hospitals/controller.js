// Hospital controller — only Super Admin can access these
const hospitalService = require('./service');
const { createHospitalSchema, updateHospitalSchema } = require('./validator');
const { success, error, paginated } = require('../../shared/response');

// GET /api/hospitals
const getAllHospitals = async (req, res, next) => {
  try {
    const { hospitals, total, page, limit } = await hospitalService.getAllHospitals(req.query);
    return paginated(res, hospitals, total, page, limit);
  } catch (err) {
    next(err);
  }
};

// GET /api/hospitals/stats
const getStats = async (req, res, next) => {
  try {
    const stats = await hospitalService.getHospitalStats();
    return success(res, stats, 'Hospital stats fetched');
  } catch (err) {
    next(err);
  }
};

// GET /api/hospitals/:id
const getHospital = async (req, res, next) => {
  try {
    const hospital = await hospitalService.getHospitalById(req.params.id);
    return success(res, hospital, 'Hospital fetched');
  } catch (err) {
    next(err);
  }
};

// POST /api/hospitals
const createHospital = async (req, res, next) => {
  try {
    const data = createHospitalSchema.parse(req.body);
    const hospital = await hospitalService.createHospital(data);
    return success(res, hospital, 'Hospital created successfully', 201);
  } catch (err) {
    next(err);
  }
};

// PUT /api/hospitals/:id
const updateHospital = async (req, res, next) => {
  try {
    const data = updateHospitalSchema.parse(req.body);
    const hospital = await hospitalService.updateHospital(req.params.id, data);
    return success(res, hospital, 'Hospital updated successfully');
  } catch (err) {
    next(err);
  }
};

// DELETE /api/hospitals/:id
const deleteHospital = async (req, res, next) => {
  try {
    const result = await hospitalService.deleteHospital(req.params.id);
    return success(res, result, 'Hospital deleted successfully');
  } catch (err) {
    next(err);
  }
};

// PATCH /api/hospitals/:id/toggle-status
const toggleStatus = async (req, res, next) => {
  try {
    const hospital = await hospitalService.toggleHospitalStatus(req.params.id);
    return success(res, hospital, `Hospital ${hospital.is_active ? 'activated' : 'deactivated'}`);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getAllHospitals, getStats, getHospital,
  createHospital, updateHospital, deleteHospital, toggleStatus
};