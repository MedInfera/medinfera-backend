const { query } = require('../../config/db');
const { getPagination } = require('../../shared/paginate');
const { generateNumber } = require('../../shared/generateNumber');

// Get all appointments for a hospital with filters
const getAllAppointments = async (hospitalId, queryParams) => {
  const { page, limit, offset } = getPagination(queryParams);
  const { status, doctor_id, date } = queryParams;

  let conditions = ['a.hospital_id = $1'];
  let values = [parseInt(hospitalId)];
  let counter = 2;

  if (status) {
    conditions.push(`a.status = $${counter}`);
    values.push(status);
    counter++;
  }
  if (doctor_id) {
    conditions.push(`a.doctor_id = $${counter}`);
    values.push(parseInt(doctor_id));
    counter++;
  }
  if (date) {
    conditions.push(`a.appointment_date = $${counter}`);
    values.push(date);
    counter++;
  }

  const whereClause = conditions.join(' AND ');

  const result = await query(
    `SELECT a.id, a.uuid, a.appointment_number, a.appointment_date,
            a.start_time, a.end_time, a.appointment_type, a.status,
            a.payment_status, a.consultation_fee, a.chief_complaint,
            a.is_followup, a.created_at,
            pu.first_name as patient_first_name, pu.last_name as patient_last_name,
            pu.phone as patient_phone,
            du.first_name as doctor_first_name, du.last_name as doctor_last_name,
            d.specialization
     FROM public.appointments a
     JOIN public.patients p ON a.patient_id = p.id
     JOIN public.users pu ON p.user_id = pu.id
     JOIN public.doctors d ON a.doctor_id = d.id
     JOIN public.users du ON d.user_id = du.id
     WHERE ${whereClause}
     ORDER BY a.appointment_date DESC, a.start_time ASC
     LIMIT $${counter} OFFSET $${counter + 1}`,
    [...values, limit, offset]
  );

  const countResult = await query(
    `SELECT COUNT(*) FROM public.appointments a WHERE ${whereClause}`,
    values
  );

  return {
    appointments: result.rows,
    total: parseInt(countResult.rows[0].count),
    page, limit
  };
};

// Get single appointment
const getAppointmentById = async (id, hospitalId) => {
  const result = await query(
    `SELECT a.*,
            pu.first_name as patient_first_name, pu.last_name as patient_last_name,
            pu.phone as patient_phone, pu.email as patient_email,
            du.first_name as doctor_first_name, du.last_name as doctor_last_name,
            d.specialization, d.consultation_fee as doctor_fee
     FROM public.appointments a
     JOIN public.patients p ON a.patient_id = p.id
     JOIN public.users pu ON p.user_id = pu.id
     JOIN public.doctors d ON a.doctor_id = d.id
     JOIN public.users du ON d.user_id = du.id
     WHERE a.id = $1 AND a.hospital_id = $2`,
    [parseInt(id), parseInt(hospitalId)]
  );
  if (result.rows.length === 0) {
    const err = new Error('Appointment not found');
    err.statusCode = 404;
    throw err;
  }
  return result.rows[0];
};

// Book a new appointment
const bookAppointment = async (hospitalId, data, createdBy) => {
  const { patient_id, doctor_id, appointment_date,
          start_time, appointment_type, chief_complaint,
          symptoms, is_followup, followup_from } = data;

  const doctorResult = await query(
    `SELECT d.consultation_fee, d.followup_fee, d.slot_duration
     FROM public.doctors d
     WHERE d.id = $1 AND d.hospital_id = $2 AND d.is_active = true`,
    [parseInt(doctor_id), parseInt(hospitalId)]
  );

  if (doctorResult.rows.length === 0) {
    const err = new Error('Doctor not found or inactive');
    err.statusCode = 404;
    throw err;
  }

  const doctor = doctorResult.rows[0];

  // Calculate end time based on slot duration
  const [h, m] = start_time.split(':').map(Number);
  const endMinutes = h * 60 + m + doctor.slot_duration;
  const endTime = `${String(Math.floor(endMinutes / 60)).padStart(2, '0')}:${String(endMinutes % 60).padStart(2, '0')}`;

  // Check slot conflict
  const conflict = await query(
    `SELECT id FROM public.appointments
     WHERE doctor_id = $1 AND appointment_date = $2
       AND start_time = $3 AND status NOT IN ('CANCELLED', 'NO_SHOW')`,
    [parseInt(doctor_id), appointment_date, `${start_time}:00`]
  );

  if (conflict.rows.length > 0) {
    const err = new Error('This time slot is already booked');
    err.statusCode = 409;
    throw err;
  }

  const fee = is_followup && doctor.followup_fee ? doctor.followup_fee : doctor.consultation_fee;
  const appointmentNumber = generateNumber('APT');

  const result = await query(
    `INSERT INTO public.appointments
      (hospital_id, appointment_number, patient_id, doctor_id, created_by,
       appointment_date, start_time, end_time, appointment_type, status,
       chief_complaint, symptoms, consultation_fee, is_followup, followup_from)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'PENDING',$10,$11,$12,$13,$14)
     RETURNING *`,
    [parseInt(hospitalId), appointmentNumber, parseInt(patient_id),
     parseInt(doctor_id), parseInt(createdBy),
     appointment_date, `${start_time}:00`, `${endTime}:00`,
     appointment_type, chief_complaint || null,
     JSON.stringify(symptoms || []), fee,
     is_followup || false, followup_from || null]
  );

  return result.rows[0];
};

// Update appointment status
const updateStatus = async (id, hospitalId, data, updatedBy) => {
  const appointment = await getAppointmentById(id, hospitalId);

  const { status, cancelled_reason, consultation_notes } = data;

  const validTransitions = {
    'PENDING': ['CONFIRMED', 'CANCELLED'],
    'CONFIRMED': ['IN_PROGRESS', 'CANCELLED', 'NO_SHOW'],
    'IN_PROGRESS': ['COMPLETED'],
    'COMPLETED': [],
    'CANCELLED': [],
    'NO_SHOW': [],
  };

  if (!validTransitions[appointment.status].includes(status)) {
    const err = new Error(`Cannot change status from ${appointment.status} to ${status}`);
    err.statusCode = 400;
    throw err;
  }

  // Handle timestamps in JS to avoid PostgreSQL CASE type confusion
  const cancelledAt = status === 'CANCELLED' ? new Date() : null;
  const completedAt = status === 'COMPLETED' ? new Date() : null;

  const result = await query(
    `UPDATE public.appointments SET
       status = $1,
       cancelled_reason = COALESCE($2, cancelled_reason),
       consultation_notes = COALESCE($3, consultation_notes),
       cancelled_at = COALESCE($4, cancelled_at),
       completed_at = COALESCE($5, completed_at),
       updated_at = NOW()
     WHERE id = $6 AND hospital_id = $7
     RETURNING *`,
    [status, cancelled_reason || null, consultation_notes || null,
     cancelledAt, completedAt,
     parseInt(id), parseInt(hospitalId)]
  );

  return result.rows[0];
};

// Get today's appointments for a doctor
const getTodayAppointments = async (hospitalId, doctorId) => {
  const today = new Date().toISOString().split('T')[0];
  const result = await query(
    `SELECT a.id, a.appointment_number, a.start_time, a.end_time,
            a.appointment_type, a.status, a.chief_complaint,
            u.first_name as patient_first_name, u.last_name as patient_last_name,
            u.phone as patient_phone,
            p.blood_group, p.allergies
     FROM public.appointments a
     JOIN public.patients p ON a.patient_id = p.id
     JOIN public.users u ON p.user_id = u.id
     WHERE a.hospital_id = $1 AND a.doctor_id = $2
       AND a.appointment_date = $3
       AND a.status NOT IN ('CANCELLED', 'NO_SHOW')
     ORDER BY a.start_time ASC`,
    [parseInt(hospitalId), parseInt(doctorId), today]
  );
  return result.rows;
};

module.exports = {
  getAllAppointments, getAppointmentById,
  bookAppointment, updateStatus, getTodayAppointments
};