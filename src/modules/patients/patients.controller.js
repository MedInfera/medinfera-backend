const service = require('./patients.service');
const response = require('../../utils/response');
const asyncHandler = require('../../utils/asyncHandler');

const create = asyncHandler(async (req, res) => {
  const patient = await service.create(req.body, req.user);
  response.created(res, patient, 'Patient registered successfully');
});

const findAll = asyncHandler(async (req, res) => {
  const { data, pagination } = await service.findAll(req.query, req.user);
  response.paginated(res, data, pagination);
});

const findById = asyncHandler(async (req, res) => {
  const patient = await service.findById(req.params.id, req.user);
  response.success(res, patient);
});

const update = asyncHandler(async (req, res) => {
  const patient = await service.update(req.params.id, req.body, req.user, req);
  response.success(res, patient, 'Patient updated');
});

const remove = asyncHandler(async (req, res) => {
  await service.softDelete(req.params.id, req.user, req);
  response.success(res, null, 'Patient deleted');
});

const addVitals = asyncHandler(async (req, res) => {
  const vitals = await service.addVitalSigns(req.params.id, req.body, req.user);
  response.created(res, vitals, 'Vital signs recorded');
});

const getVitals = asyncHandler(async (req, res) => {
  const vitals = await service.getVitalHistory(req.params.id, req.query, req.user);
  response.success(res, vitals);
});

const getMedicalHistory = asyncHandler(async (req, res) => {
  const history = await service.getMedicalHistory(req.params.id, req.user);
  response.success(res, history);
});

module.exports = { create, findAll, findById, update, remove, addVitals, getVitals, getMedicalHistory };
