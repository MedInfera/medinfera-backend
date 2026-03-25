const service = require('./hospitals.service');
const response = require('../../utils/response');
const asyncHandler = require('../../utils/asyncHandler');

const create = asyncHandler(async (req, res) => {
  const hospital = await service.create(req.body, req.user.id);
  response.created(res, hospital, 'Hospital created');
});

const findAll = asyncHandler(async (req, res) => {
  const { data, pagination } = await service.findAll(req.query);
  response.paginated(res, data, pagination);
});

const findById = asyncHandler(async (req, res) => {
  const hospital = await service.findById(req.params.id);
  response.success(res, hospital);
});

const update = asyncHandler(async (req, res) => {
  const hospital = await service.update(req.params.id, req.body, req.user.id, req);
  response.success(res, hospital, 'Hospital updated');
});

const remove = asyncHandler(async (req, res) => {
  await service.softDelete(req.params.id, req.user.id, req);
  response.success(res, null, 'Hospital deleted');
});

const getStats = asyncHandler(async (req, res) => {
  const stats = await service.getStats(req.params.id);
  response.success(res, stats);
});

module.exports = { create, findAll, findById, update, remove, getStats };
