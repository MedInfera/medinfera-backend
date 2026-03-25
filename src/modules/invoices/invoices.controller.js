const service = require('./invoices.service');
const response = require('../../utils/response');
const asyncHandler = require('../../utils/asyncHandler');

const createInvoice = asyncHandler(async (req, res) => {
  const invoice = await service.createInvoice(req.body, req.user);
  response.created(res, invoice, 'Invoice created');
});

const getInvoices = asyncHandler(async (req, res) => {
  const { data, pagination } = await service.getInvoices(req.query, req.user);
  response.paginated(res, data, pagination);
});

const getInvoiceById = asyncHandler(async (req, res) => {
  const invoice = await service.getInvoiceById(req.params.id, req.user);
  response.success(res, invoice);
});

const issueInvoice = asyncHandler(async (req, res) => {
  const invoice = await service.issueInvoice(req.params.id, req.user);
  response.success(res, invoice, 'Invoice issued successfully');
});

const cancelInvoice = asyncHandler(async (req, res) => {
  const invoice = await service.cancelInvoice(req.params.id, req.user);
  response.success(res, invoice, 'Invoice cancelled');
});

const recordPayment = asyncHandler(async (req, res) => {
  const payment = await service.recordPayment(req.body, req.user);
  response.created(res, payment, 'Payment recorded successfully');
});

const getPaymentHistory = asyncHandler(async (req, res) => {
  const { data, pagination } = await service.getPaymentHistory(req.query, req.user);
  response.paginated(res, data, pagination);
});

const getRevenueStats = asyncHandler(async (req, res) => {
  const stats = await service.getRevenueStats(req.query, req.user);
  response.success(res, stats);
});

module.exports = {
  createInvoice,
  getInvoices,
  getInvoiceById,
  issueInvoice,
  cancelInvoice,
  recordPayment,
  getPaymentHistory,
  getRevenueStats,
};
