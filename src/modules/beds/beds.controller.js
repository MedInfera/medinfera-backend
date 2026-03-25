const service = require('./beds.service');
const response = require('../../utils/response');
const asyncHandler = require('../../utils/asyncHandler');

// ─── Ward Controllers ─────────────────────────────────────────────────────────

const createWard = asyncHandler(async (req, res) => {
  const ward = await service.createWard(req.body, req.user);
  response.created(res, ward, 'Ward created successfully');
});

const getWards = asyncHandler(async (req, res) => {
  const wards = await service.getWards(req.user);
  response.success(res, wards);
});

const getWardById = asyncHandler(async (req, res) => {
  const ward = await service.getWardById(req.params.id, req.user);
  response.success(res, ward);
});

const updateWard = asyncHandler(async (req, res) => {
  const ward = await service.updateWard(req.params.id, req.body, req.user);
  response.success(res, ward, 'Ward updated');
});

// ─── Bed Controllers ──────────────────────────────────────────────────────────

const createBed = asyncHandler(async (req, res) => {
  const bed = await service.createBed(req.body, req.user);
  response.created(res, bed, 'Bed created successfully');
});

const getBeds = asyncHandler(async (req, res) => {
  const { data, pagination } = await service.getBeds(req.query, req.user);
  response.paginated(res, data, pagination);
});

const getBedById = asyncHandler(async (req, res) => {
  const bed = await service.getBedById(req.params.id, req.user);
  response.success(res, bed);
});

const updateBedStatus = asyncHandler(async (req, res) => {
  const bed = await service.updateBedStatus(req.params.id, req.body.status, req.user);
  response.success(res, bed, 'Bed status updated');
});

const getOccupancyStats = asyncHandler(async (req, res) => {
  const stats = await service.getOccupancyStats(req.user);
  response.success(res, stats);
});

module.exports = {
  createWard,
  getWards,
  getWardById,
  updateWard,
  createBed,
  getBeds,
  getBedById,
  updateBedStatus,
  getOccupancyStats,
};
