const service = require('./lab.service');
const response = require('../../utils/response');
const asyncHandler = require('../../utils/asyncHandler');

const createLabTest     = asyncHandler(async (req, res) => { response.created(res, await service.createLabTest(req.body, req.user), 'Lab test created'); });
const getLabTests       = asyncHandler(async (req, res) => { response.success(res, await service.getLabTests(req.query, req.user)); });
const updateLabTest     = asyncHandler(async (req, res) => { response.success(res, await service.updateLabTest(req.params.id, req.body, req.user), 'Lab test updated'); });

const createLabOrder    = asyncHandler(async (req, res) => { response.created(res, await service.createLabOrder(req.body, req.user), 'Lab order created'); });
const getLabOrders      = asyncHandler(async (req, res) => { const { data, pagination } = await service.getLabOrders(req.query, req.user); response.paginated(res, data, pagination); });
const getLabOrderById   = asyncHandler(async (req, res) => { response.success(res, await service.getLabOrderById(req.params.id, req.user)); });
const updateLabOrderStatus = asyncHandler(async (req, res) => { response.success(res, await service.updateLabOrderStatus(req.params.id, req.body.status, req.user), 'Status updated'); });
const enterResults      = asyncHandler(async (req, res) => { response.success(res, await service.enterResults(req.params.id, req.body, req.user), 'Results entered successfully'); });

module.exports = { createLabTest, getLabTests, updateLabTest, createLabOrder, getLabOrders, getLabOrderById, updateLabOrderStatus, enterResults };
