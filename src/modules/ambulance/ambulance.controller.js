const service = require('./ambulance.service');
const response = require('../../utils/response');
const asyncHandler = require('../../utils/asyncHandler');

const createAmbulance = asyncHandler(async (req, res) => {
  const amb = await service.createAmbulance(req.body, req.user);
  response.created(res, amb, 'Ambulance added to fleet');
});

const getAmbulances = asyncHandler(async (req, res) => {
  const ambulances = await service.getAmbulances(req.query, req.user);
  response.success(res, ambulances);
});

const getAmbulanceById = asyncHandler(async (req, res) => {
  const amb = await service.getAmbulanceById(req.params.id, req.user);
  response.success(res, amb);
});

const updateAmbulance = asyncHandler(async (req, res) => {
  const amb = await service.updateAmbulance(req.params.id, req.body, req.user);
  response.success(res, amb, 'Ambulance updated');
});

const createDispatch = asyncHandler(async (req, res) => {
  const dispatch = await service.createDispatch(req.body, req.user);
  response.created(res, dispatch, 'Ambulance dispatched successfully');
});

const getDispatches = asyncHandler(async (req, res) => {
  const { data, pagination } = await service.getDispatches(req.query, req.user);
  response.paginated(res, data, pagination);
});

const getDispatchById = asyncHandler(async (req, res) => {
  const dispatch = await service.getDispatchById(req.params.id, req.user);
  response.success(res, dispatch);
});

const updateDispatchStatus = asyncHandler(async (req, res) => {
  const dispatch = await service.updateDispatchStatus(req.params.id, req.body, req.user);
  response.success(res, dispatch, 'Dispatch status updated');
});

const updateLocation = asyncHandler(async (req, res) => {
  await service.updateLocation(req.params.id, req.body, req.user);
  response.success(res, null, 'Location updated');
});

const getLocationTrail = asyncHandler(async (req, res) => {
  const trail = await service.getLocationTrail(req.params.id, req.query, req.user);
  response.success(res, trail);
});

module.exports = {
  createAmbulance,
  getAmbulances,
  getAmbulanceById,
  updateAmbulance,
  createDispatch,
  getDispatches,
  getDispatchById,
  updateDispatchStatus,
  updateLocation,
  getLocationTrail,
};
