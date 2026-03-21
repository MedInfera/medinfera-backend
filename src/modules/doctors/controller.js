// Doctor controller
const doctorService = require('./service');
const { createDoctorSchema, updateDoctorSchema, scheduleSchema } = require('./validator');
const { success, paginated } = require('../../shared/response');

// GET /api/doctors
const getAllDoctors = async (req, res, next) => {
  try {
    const { doctors, total, page, limit } = await doctorService.getAllDoctors(
      req.hospitalId, req.query
    );
    return paginated(res, doctors, total, page, limit);
  } catch (err) { next(err); }
};

// GET /api/doctors/:id
const getDoctor = async (req, res, next) => {
  try {
    const doctor = await doctorService.getDoctorById(req.params.id, req.hospitalId);
    return success(res, doctor, 'Doctor fetched');
  } catch (err) { next(err); }
};

// POST /api/doctors
const createDoctor = async (req, res, next) => {
  try {
    const data = createDoctorSchema.parse(req.body);
    const doctor = await doctorService.createDoctor(req.hospitalId, data, req.user.id);
    return success(res, doctor, 'Doctor created successfully', 201);
  } catch (err) { next(err); }
};

// PUT /api/doctors/:id
const updateDoctor = async (req, res, next) => {
  try {
    const data = updateDoctorSchema.parse(req.body);
    const doctor = await doctorService.updateDoctor(req.params.id, req.hospitalId, data);
    return success(res, doctor, 'Doctor updated successfully');
  } catch (err) { next(err); }
};

// POST /api/doctors/:id/schedule
const setSchedule = async (req, res, next) => {
  try {
    const { schedules } = scheduleSchema.parse(req.body);
    const result = await doctorService.setSchedule(req.params.id, req.hospitalId, schedules);
    return success(res, result, 'Schedule updated successfully');
  } catch (err) { next(err); }
};

// GET /api/doctors/:id/schedule
const getSchedule = async (req, res, next) => {
  try {
    const schedule = await doctorService.getSchedule(req.params.id, req.hospitalId);
    return success(res, schedule, 'Schedule fetched');
  } catch (err) { next(err); }
};

// GET /api/doctors/:id/slots?date=2025-03-25
const getAvailableSlots = async (req, res, next) => {
  try {
    const { date } = req.query;
    if (!date) {
      return require('../../shared/response').error(res, 'Date is required', 400);
    }
    const slots = await doctorService.getAvailableSlots(
      req.params.id, req.hospitalId, date
    );
    return success(res, slots, 'Available slots fetched');
  } catch (err) { next(err); }
};

module.exports = {
  getAllDoctors, getDoctor, createDoctor,
  updateDoctor, setSchedule, getSchedule, getAvailableSlots
};