const patientService = require('./service');
const { createPatientSchema, updatePatientSchema } = require('./validator');
const { success, paginated } = require('../../shared/response');

// GET /api/patients
const getAllPatients = async (req, res, next) => {
  try {
    const { patients, total, page, limit } = await patientService.getAllPatients(
      req.hospitalId, req.query
    );
    return paginated(res, patients, total, page, limit);
  } catch (err) { next(err); }
};

// GET /api/patients/:id
const getPatient = async (req, res, next) => {
  try {
    const patient = await patientService.getPatientById(req.params.id, req.hospitalId);
    return success(res, patient, 'Patient fetched');
  } catch (err) { next(err); }
};

// POST /api/patients
const createPatient = async (req, res, next) => {
  try {
    const data = createPatientSchema.parse(req.body);
    const patient = await patientService.createPatient(req.hospitalId, data, req.user.id);
    return success(res, patient, 'Patient registered successfully', 201);
  } catch (err) { next(err); }
};

// GET /api/patients/:id/history
const getHistory = async (req, res, next) => {
  try {
    const history = await patientService.getPatientHistory(req.params.id, req.hospitalId);
    return success(res, history, 'Patient history fetched');
  } catch (err) { next(err); }
};

module.exports = { getAllPatients, getPatient, createPatient, getHistory };