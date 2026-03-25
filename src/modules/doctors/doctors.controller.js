const service = require('./doctors.service');
const response = require('../../utils/response');
const asyncHandler = require('../../utils/asyncHandler');

const create = asyncHandler(async (req, res) => {
  const doctor = await service.create(req.body, req.user);
  response.created(res, doctor, 'Doctor profile created');
});
const findAll = asyncHandler(async (req, res) => {
  const { data, pagination } = await service.findAll(req.query, req.user);
  response.paginated(res, data, pagination);
});
const findById = asyncHandler(async (req, res) => {
  const doctor = await service.findById(req.params.id, req.user);
  response.success(res, doctor);
});
const update = asyncHandler(async (req, res) => {
  const doctor = await service.update(req.params.id, req.body, req.user);
  response.success(res, doctor, 'Doctor profile updated');
});
const upsertSchedule = asyncHandler(async (req, res) => {
  const schedule = await service.upsertSchedule(req.params.id, req.body, req.user);
  response.success(res, schedule, 'Schedule saved');
});
const deleteSchedule = asyncHandler(async (req, res) => {
  await service.deleteSchedule(req.params.id, req.params.scheduleId, req.user);
  response.success(res, null, 'Schedule removed');
});
const addLeave = asyncHandler(async (req, res) => {
  const leave = await service.addLeave(req.params.id, req.body, req.user);
  response.created(res, leave, 'Leave marked');
});
const removeLeave = asyncHandler(async (req, res) => {
  await service.removeLeave(req.params.id, req.params.leaveId, req.user);
  response.success(res, null, 'Leave removed');
});
const getDashboard = asyncHandler(async (req, res) => {
  const data = await service.getDashboard(req.params.id, req.user);
  response.success(res, data);
});

module.exports = { create, findAll, findById, update, upsertSchedule, deleteSchedule, addLeave, removeLeave, getDashboard };
