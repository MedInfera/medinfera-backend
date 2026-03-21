// Doctor service — create doctors, manage schedules, get available slots
const bcrypt = require('bcryptjs');
const { query, getClient } = require('../../config/db');
const { getPagination } = require('../../shared/paginate');

// Get all doctors for a hospital
const getAllDoctors = async (hospitalId, queryParams) => {
  const { page, limit, offset } = getPagination(queryParams);
  const search = queryParams.search || '';
  const specialization = queryParams.specialization || '';

  const result = await query(
    `SELECT d.id, d.uuid, d.specialization, d.qualification,
            d.experience_years, d.consultation_fee, d.followup_fee,
            d.slot_duration, d.is_online_available, d.is_active,
            d.is_verified, d.meeting_provider,
            u.first_name, u.last_name, u.email, u.phone, u.profile_photo
     FROM public.doctors d
     JOIN public.users u ON d.user_id = u.id
     WHERE d.hospital_id = $1 AND d.deleted_at IS NULL
       AND (u.first_name ILIKE $2 OR u.last_name ILIKE $2 OR d.specialization ILIKE $2)
       AND ($3 = '' OR d.specialization ILIKE $3)
     ORDER BY d.created_at DESC
     LIMIT $4 OFFSET $5`,
    [hospitalId, `%${search}%`, `%${specialization}%`, limit, offset]
  );

  const countResult = await query(
    `SELECT COUNT(*) FROM public.doctors d
     JOIN public.users u ON d.user_id = u.id
     WHERE d.hospital_id = $1 AND d.deleted_at IS NULL`,
    [hospitalId]
  );

  return {
    doctors: result.rows,
    total: parseInt(countResult.rows[0].count),
    page, limit
  };
};

// Get single doctor by ID
const getDoctorById = async (id, hospitalId) => {
  const result = await query(
    `SELECT d.*, u.first_name, u.last_name, u.email, u.phone, u.profile_photo
     FROM public.doctors d
     JOIN public.users u ON d.user_id = u.id
     WHERE d.id = $1 AND d.hospital_id = $2 AND d.deleted_at IS NULL`,
    [id, hospitalId]
  );
  if (result.rows.length === 0) {
    const err = new Error('Doctor not found');
    err.statusCode = 404;
    throw err;
  }
  return result.rows[0];
};

// Create doctor — creates user account + doctor profile in one transaction
const createDoctor = async (hospitalId, data, createdBy) => {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    // Create user account for doctor
    const password_hash = await bcrypt.hash(data.password, 12);
    const userResult = await client.query(
      `INSERT INTO public.users
        (hospital_id, role_id, first_name, last_name, email, password_hash, phone, created_by)
       VALUES ($1, 3, $2, $3, $4, $5, $6, $7)
       RETURNING id`,
      [hospitalId, data.first_name, data.last_name, data.email,
       password_hash, data.phone, createdBy]
    );

    const userId = userResult.rows[0].id;

    // Create doctor profile
    const doctorResult = await client.query(
      `INSERT INTO public.doctors
        (hospital_id, user_id, registration_number, specialization, qualification,
         experience_years, consultation_fee, followup_fee, slot_duration,
         max_appointments_per_day, is_online_available, meeting_provider, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
       RETURNING *`,
      [hospitalId, userId, data.registration_number, data.specialization,
       data.qualification, data.experience_years || 0, data.consultation_fee || 0,
       data.followup_fee || 0, data.slot_duration || 15,
       data.max_appointments_per_day || 20, data.is_online_available ?? true,
       data.meeting_provider || 'GOOGLE_MEET', createdBy]
    );

    await client.query('COMMIT');

    return {
      ...doctorResult.rows[0],
      first_name: data.first_name,
      last_name: data.last_name,
      email: data.email,
      phone: data.phone,
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

// Update doctor profile
const updateDoctor = async (id, hospitalId, data) => {
  await getDoctorById(id, hospitalId);

  const fields = [];
  const values = [];
  let counter = 1;

  const allowed = ['specialization', 'qualification', 'experience_years',
    'consultation_fee', 'followup_fee', 'slot_duration',
    'max_appointments_per_day', 'is_online_available',
    'meeting_provider', 'is_active', 'is_verified'];

  allowed.forEach((field) => {
    if (data[field] !== undefined) {
      fields.push(`${field} = $${counter}`);
      values.push(data[field]);
      counter++;
    }
  });

  if (fields.length === 0) {
    const err = new Error('No fields to update');
    err.statusCode = 400;
    throw err;
  }

  fields.push(`updated_at = NOW()`);
  values.push(id, hospitalId);

  const result = await query(
    `UPDATE public.doctors SET ${fields.join(', ')}
     WHERE id = $${counter} AND hospital_id = $${counter + 1}
     RETURNING *`,
    values
  );
  return result.rows[0];
};

// Set doctor weekly schedule
const setSchedule = async (doctorId, hospitalId, schedules) => {
  // Verify doctor belongs to this hospital
  await getDoctorById(doctorId, hospitalId);

  const client = await getClient();
  try {
    await client.query('BEGIN');

    // Delete existing schedules and replace with new ones
    await client.query(
      'DELETE FROM public.doctor_schedules WHERE doctor_id = $1',
      [doctorId]
    );

    for (const schedule of schedules) {
      await client.query(
        `INSERT INTO public.doctor_schedules
          (doctor_id, day_of_week, start_time, end_time, break_start_time, break_end_time, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [doctorId, schedule.day_of_week, schedule.start_time,
         schedule.end_time, schedule.break_start_time || null,
         schedule.break_end_time || null, schedule.is_active ?? true]
      );
    }

    await client.query('COMMIT');

    // Return updated schedules
    const result = await query(
      'SELECT * FROM public.doctor_schedules WHERE doctor_id = $1 ORDER BY day_of_week',
      [doctorId]
    );
    return result.rows;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

// Get doctor schedules
const getSchedule = async (doctorId, hospitalId) => {
  await getDoctorById(doctorId, hospitalId);
  const result = await query(
    'SELECT * FROM public.doctor_schedules WHERE doctor_id = $1 ORDER BY day_of_week',
    [doctorId]
  );
  return result.rows;
};

// Get available time slots for a doctor on a specific date
const getAvailableSlots = async (doctorId, hospitalId, date) => {
  const doctor = await getDoctorById(doctorId, hospitalId);

  // Get day of week (0=Sunday, 1=Monday...)
  const dayOfWeek = new Date(date).getDay();

  // Get doctor schedule for this day
  const scheduleResult = await query(
    `SELECT * FROM public.doctor_schedules 
     WHERE doctor_id = $1 AND day_of_week = $2 AND is_active = true`,
    [doctorId, dayOfWeek]
  );

  if (scheduleResult.rows.length === 0) {
    return { available: false, message: 'Doctor not available on this day', slots: [] };
  }

  const schedule = scheduleResult.rows[0];

  // Get already booked slots for this date
  const bookedResult = await query(
    `SELECT start_time, end_time FROM public.appointments
     WHERE doctor_id = $1 AND appointment_date = $2
       AND status NOT IN ('CANCELLED', 'NO_SHOW')`,
    [doctorId, date]
  );

  const bookedSlots = bookedResult.rows.map(r => r.start_time);

  // Generate all possible slots based on slot_duration
  const slots = [];
  const slotDuration = doctor.slot_duration || 15;
  const [startHour, startMin] = schedule.start_time.split(':').map(Number);
  const [endHour, endMin] = schedule.end_time.split(':').map(Number);

  let current = startHour * 60 + startMin;
  const end = endHour * 60 + endMin;

  while (current + slotDuration <= end) {
    const h = String(Math.floor(current / 60)).padStart(2, '0');
    const m = String(current % 60).padStart(2, '0');
    const slotTime = `${h}:${m}:00`;

    // Skip break time
    if (schedule.break_start_time && schedule.break_end_time) {
      const [bsh, bsm] = schedule.break_start_time.split(':').map(Number);
      const [beh, bem] = schedule.break_end_time.split(':').map(Number);
      const breakStart = bsh * 60 + bsm;
      const breakEnd = beh * 60 + bem;
      if (current >= breakStart && current < breakEnd) {
        current += slotDuration;
        continue;
      }
    }

    slots.push({
      time: slotTime,
      available: !bookedSlots.includes(slotTime),
    });

    current += slotDuration;
  }

  return { available: true, date, slots };
};

module.exports = {
  getAllDoctors, getDoctorById, createDoctor,
  updateDoctor, setSchedule, getSchedule, getAvailableSlots
};