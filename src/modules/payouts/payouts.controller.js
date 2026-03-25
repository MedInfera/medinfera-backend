const service = require('./payouts.service');
const response = require('../../utils/response');
const asyncHandler = require('../../utils/asyncHandler');

// Payroll
const createPayroll = asyncHandler(async (req, res) => {
  const payroll = await service.createPayroll(req.body, req.user);
  response.created(res, payroll, 'Payroll record created');
});
const getPayrolls = asyncHandler(async (req, res) => {
  const { data, pagination } = await service.getPayrolls(req.query, req.user);
  response.paginated(res, data, pagination);
});
const getPayrollById = asyncHandler(async (req, res) => {
  const payroll = await service.getPayrollById(req.params.id, req.user);
  response.success(res, payroll);
});
const processPayroll = asyncHandler(async (req, res) => {
  const payroll = await service.processPayroll(req.params.id, req.user);
  response.success(res, payroll, 'Payroll processed — payout record created');
});

// Payouts
const createPayout = asyncHandler(async (req, res) => {
  const payout = await service.createPayout(req.body, req.user);
  response.created(res, payout, 'Payout created');
});
const getPayouts = asyncHandler(async (req, res) => {
  const { data, pagination } = await service.getPayouts(req.query, req.user);
  response.paginated(res, data, pagination);
});
const getPayoutById = asyncHandler(async (req, res) => {
  const payout = await service.getPayoutById(req.params.id, req.user);
  response.success(res, payout);
});
const markPayoutPaid = asyncHandler(async (req, res) => {
  const payout = await service.markPayoutPaid(req.params.id, req.body, req.user);
  response.success(res, payout, 'Payout marked as paid');
});

module.exports = {
  createPayroll, getPayrolls, getPayrollById, processPayroll,
  createPayout, getPayouts, getPayoutById, markPayoutPaid,
};
