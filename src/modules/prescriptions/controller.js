const prescriptionService = require('./service');
const { createPrescriptionSchema } = require('./validator');
const { success, error } = require('../../shared/response');

// POST /api/prescriptions
const createPrescription = async (req, res, next) => {
  try {
    const data = createPrescriptionSchema.parse(req.body);
    const prescription = await prescriptionService.createPrescription(
      req.hospitalId, data, req.user.id
    );
    return success(res, prescription, 'Prescription created successfully', 201);
  } catch (err) { next(err); }
};

// GET /api/prescriptions/:id
const getPrescription = async (req, res, next) => {
  try {
    const prescription = await prescriptionService.getPrescriptionById(
      req.params.id, req.hospitalId
    );
    return success(res, prescription, 'Prescription fetched');
  } catch (err) { next(err); }
};

// GET /api/prescriptions/patient/:patientId
const getPatientPrescriptions = async (req, res, next) => {
  try {
    const prescriptions = await prescriptionService.getPatientPrescriptions(
      req.params.patientId, req.hospitalId
    );
    return success(res, prescriptions, 'Patient prescriptions fetched');
  } catch (err) { next(err); }
};

// GET /api/prescriptions/verify/:prescriptionNumber
const verifyPrescription = async (req, res, next) => {
  try {
    const result = await prescriptionService.verifyPrescription(
      req.params.prescriptionNumber
    );
    return success(res, result, 'Prescription verified');
  } catch (err) { next(err); }
};

module.exports = {
  createPrescription, getPrescription,
  getPatientPrescriptions, verifyPrescription
};