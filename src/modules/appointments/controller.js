const appointmentService = require('./service');
const { bookAppointmentSchema, updateStatusSchema } = require('./validator');
const { success, paginated } = require('../../shared/response');

// GET /api/appointments
const getAllAppointments = async (req, res, next) => {
  try {
    const { appointments, total, page, limit } = await appointmentService.getAllAppointments(
      req.hospitalId, req.query
    );
    return paginated(res, appointments, total, page, limit);
  } catch (err) { next(err); }
};

// GET /api/appointments/today
const getTodayAppointments = async (req, res, next) => {
  try {
    // Doctor sees their own, staff/admin sees by doctor_id query param
    const doctorId = req.query.doctor_id || null;
    if (!doctorId) {
      return require('../../shared/response').error(res, 'doctor_id is required', 400);
    }
    const appointments = await appointmentService.getTodayAppointments(
      req.hospitalId, doctorId
    );
    return success(res, appointments, "Today's appointments fetched");
  } catch (err) { next(err); }
};

// GET /api/appointments/:id
const getAppointment = async (req, res, next) => {
  try {
    const appointment = await appointmentService.getAppointmentById(
      req.params.id, req.hospitalId
    );
    return success(res, appointment, 'Appointment fetched');
  } catch (err) { next(err); }
};

// POST /api/appointments
const bookAppointment = async (req, res, next) => {
  try {
    const data = bookAppointmentSchema.parse(req.body);
    const appointment = await appointmentService.bookAppointment(
      req.hospitalId, data, req.user.id
    );
    return success(res, appointment, 'Appointment booked successfully', 201);
  } catch (err) { next(err); }
};

// PATCH /api/appointments/:id/status
const updateStatus = async (req, res, next) => {
  try {
    const data = updateStatusSchema.parse(req.body);
    const appointment = await appointmentService.updateStatus(
      req.params.id, req.hospitalId, data, req.user.id
    );
    return success(res, appointment, `Appointment ${data.status.toLowerCase()}`);
  } catch (err) { next(err); }
};

module.exports = {
  getAllAppointments, getTodayAppointments,
  getAppointment, bookAppointment, updateStatus
};