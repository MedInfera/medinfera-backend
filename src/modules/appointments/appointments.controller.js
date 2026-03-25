const service = require('./appointments.service');
const response = require('../../utils/response');
const asyncHandler = require('../../utils/asyncHandler');

const create = asyncHandler(async (req, res) => {
  const appt = await service.create(req.body, req.user);
  response.created(res, appt, 'Appointment booked');
});

const findAll = asyncHandler(async (req, res) => {
  const { data, pagination } = await service.findAll(req.query, req.user);
  response.paginated(res, data, pagination);
});

const findById = asyncHandler(async (req, res) => {
  const appt = await service.findById(req.params.id, req.user);
  response.success(res, appt);
});

const updateStatus = asyncHandler(async (req, res) => {
  const appt = await service.updateStatus(req.params.id, req.body, req.user, req);
  response.success(res, appt, 'Appointment status updated');
});

const reschedule = asyncHandler(async (req, res) => {
  const appt = await service.reschedule(req.params.id, req.body, req.user, req);
  response.created(res, appt, 'Appointment rescheduled');
});

const getSlots = asyncHandler(async (req, res) => {
  const slots = await service.getAvailableSlots(req.params.doctorId, req.query.date, req.user);
  response.success(res, slots);
});

module.exports = { create, findAll, findById, updateStatus, reschedule, getSlots };
