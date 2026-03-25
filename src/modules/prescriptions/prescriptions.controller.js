const service = require('./prescriptions.service');
const response = require('../../utils/response');
const asyncHandler = require('../../utils/asyncHandler');

const createPrescription = asyncHandler(async (req, res) => {
  const prescription = await service.createPrescription(req.body, req.user);
  response.created(res, prescription, 'Prescription created successfully');
});

const getPrescriptions = asyncHandler(async (req, res) => {
  const { data, pagination } = await service.getPrescriptions(req.query, req.user);
  response.paginated(res, data, pagination);
});

const getPrescriptionById = asyncHandler(async (req, res) => {
  const prescription = await service.getPrescriptionById(req.params.id, req.user);
  response.success(res, prescription);
});

const dispensePrescription = asyncHandler(async (req, res) => {
  const dispensing = await service.dispensePrescription(req.body, req.user);
  response.created(res, dispensing, 'Medicines dispensed successfully');
});

module.exports = {
  createPrescription,
  getPrescriptions,
  getPrescriptionById,
  dispensePrescription,
};
