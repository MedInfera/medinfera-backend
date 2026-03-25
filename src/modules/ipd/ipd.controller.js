const service = require('./ipd.service');
const response = require('../../utils/response');
const asyncHandler = require('../../utils/asyncHandler');

const admit = asyncHandler(async (req, res) => {
  const admission = await service.admit(req.body, req.user);
  response.created(res, admission, 'Patient admitted successfully');
});

const findAll = asyncHandler(async (req, res) => {
  const { data, pagination } = await service.findAll(req.query, req.user);
  response.paginated(res, data, pagination);
});

const findById = asyncHandler(async (req, res) => {
  const admission = await service.findById(req.params.id, req.user);
  response.success(res, admission);
});

const updateStatus = asyncHandler(async (req, res) => {
  const admission = await service.updateStatus(req.params.id, req.body, req.user);
  response.success(res, admission, 'Admission status updated');
});

const discharge = asyncHandler(async (req, res) => {
  const admission = await service.discharge(req.params.id, req.body, req.user, req);
  response.success(res, admission, 'Patient discharged successfully');
});

const transferBed = asyncHandler(async (req, res) => {
  const admission = await service.transferBed(req.params.id, req.body, req.user);
  response.success(res, admission, 'Bed transferred successfully');
});

const addAttendingDoctor = asyncHandler(async (req, res) => {
  const result = await service.addAttendingDoctor(req.params.id, req.body, req.user);
  response.created(res, result, 'Attending doctor added');
});

const addNote = asyncHandler(async (req, res) => {
  const note = await service.addNote(req.params.id, req.body, req.user);
  response.created(res, note, 'Note added successfully');
});

module.exports = {
  admit,
  findAll,
  findById,
  updateStatus,
  discharge,
  transferBed,
  addAttendingDoctor,
  addNote,
};
