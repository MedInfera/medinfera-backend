const paymentService = require('./service');
const { createOrderSchema, verifyPaymentSchema, cashPaymentSchema } = require('./validator');
const { success, error } = require('../../shared/response');

// POST /api/payments/order — create Razorpay order
const createOrder = async (req, res, next) => {
  try {
    const data = createOrderSchema.parse(req.body);
    const result = await paymentService.createRazorpayOrder(
      req.hospitalId, data, req.user.id
    );
    return success(res, result, 'Payment order created');
  } catch (err) { next(err); }
};

// POST /api/payments/verify — verify Razorpay payment
const verifyPayment = async (req, res, next) => {
  try {
    const data = verifyPaymentSchema.parse(req.body);
    const payment = await paymentService.verifyRazorpayPayment(data);
    return success(res, payment, 'Payment verified successfully');
  } catch (err) { next(err); }
};

// POST /api/payments/cash — record cash payment
const recordCash = async (req, res, next) => {
  try {
    const data = cashPaymentSchema.parse(req.body);
    const payment = await paymentService.recordCashPayment(
      req.hospitalId, data, req.user.id
    );
    return success(res, payment, 'Cash payment recorded', 201);
  } catch (err) { next(err); }
};

// GET /api/payments/patient/:patientId
const getPatientPayments = async (req, res, next) => {
  try {
    const payments = await paymentService.getPatientPayments(
      req.params.patientId, req.hospitalId
    );
    return success(res, payments, 'Payment history fetched');
  } catch (err) { next(err); }
};

// GET /api/payments/revenue?start_date=2026-01-01&end_date=2026-03-31
const getRevenue = async (req, res, next) => {
  try {
    const { start_date, end_date } = req.query;
    if (!start_date || !end_date) {
      return error(res, 'start_date and end_date are required', 400);
    }
    const report = await paymentService.getRevenueReport(
      req.hospitalId, start_date, end_date
    );
    return success(res, report, 'Revenue report fetched');
  } catch (err) { next(err); }
};

// GET /api/payments/doctor-payout?doctor_id=1&start_date=...&end_date=...
const getDoctorPayout = async (req, res, next) => {
  try {
    const { doctor_id, start_date, end_date } = req.query;
    if (!doctor_id || !start_date || !end_date) {
      return error(res, 'doctor_id, start_date and end_date are required', 400);
    }
    const summary = await paymentService.getDoctorPayoutSummary(
      req.hospitalId, doctor_id, start_date, end_date
    );
    return success(res, summary, 'Doctor payout summary fetched');
  } catch (err) { next(err); }
};

module.exports = {
  createOrder, verifyPayment, recordCash,
  getPatientPayments, getRevenue, getDoctorPayout
};