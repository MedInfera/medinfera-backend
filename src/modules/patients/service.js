const bcrypt = require('bcryptjs');
const { query, getClient } = require('../../config/db');
const { getPagination } = require('../../shared/paginate');

// Get all patients for a hospital
const getAllPatients = async (hospitalId, queryParams) => {
  const { page, limit, offset } = getPagination(queryParams);
  const search = queryParams.search || '';

  const result = await query(
    `SELECT p.id, p.uuid, p.date_of_birth, p.gender, p.blood_group,
            p.allergies, p.chronic_diseases, p.created_at,
            u.first_name, u.last_name, u.email, u.phone
     FROM public.patients p
     JOIN public.users u ON p.user_id = u.id
     WHERE p.hospital_id = $1 AND p.deleted_at IS NULL
       AND (u.first_name ILIKE $2 OR u.last_name ILIKE $2 
            OR u.email ILIKE $2 OR u.phone ILIKE $2)
     ORDER BY p.created_at DESC
     LIMIT $3 OFFSET $4`,
    [hospitalId, `%${search}%`, limit, offset]
  );

  const countResult = await query(
    `SELECT COUNT(*) FROM public.patients p
     JOIN public.users u ON p.user_id = u.id
     WHERE p.hospital_id = $1 AND p.deleted_at IS NULL`,
    [hospitalId]
  );

  return {
    patients: result.rows,
    total: parseInt(countResult.rows[0].count),
    page, limit
  };
};

// Get single patient
const getPatientById = async (id, hospitalId) => {
  const result = await query(
    `SELECT p.*, u.first_name, u.last_name, u.email, u.phone, u.profile_photo
     FROM public.patients p
     JOIN public.users u ON p.user_id = u.id
     WHERE p.id = $1 AND p.hospital_id = $2 AND p.deleted_at IS NULL`,
    [id, hospitalId]
  );
  if (result.rows.length === 0) {
    const err = new Error('Patient not found');
    err.statusCode = 404;
    throw err;
  }
  return result.rows[0];
};

// Create patient — creates user + patient profile in one transaction
const createPatient = async (hospitalId, data, createdBy) => {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    const password_hash = await bcrypt.hash(data.password, 12);
    const userResult = await client.query(
      `INSERT INTO public.users
        (hospital_id, role_id, first_name, last_name, email, password_hash, phone, created_by)
       VALUES ($1, 5, $2, $3, $4, $5, $6, $7)
       RETURNING id`,
      [hospitalId, data.first_name, data.last_name, data.email,
       password_hash, data.phone, createdBy]
    );

    const userId = userResult.rows[0].id;

    const patientResult = await client.query(
      `INSERT INTO public.patients
        (hospital_id, user_id, date_of_birth, gender, blood_group,
         allergies, chronic_diseases, emergency_contact_name,
         emergency_contact_phone, emergency_contact_relation, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       RETURNING *`,
      [hospitalId, userId, data.date_of_birth, data.gender,
       data.blood_group || 'UNKNOWN',
       JSON.stringify(data.allergies || []),
       JSON.stringify(data.chronic_diseases || []),
       data.emergency_contact_name || null,
       data.emergency_contact_phone || null,
       data.emergency_contact_relation || null,
       createdBy]
    );

    await client.query('COMMIT');

    return {
      ...patientResult.rows[0],
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

// Get patient's appointment history
const getPatientHistory = async (patientId, hospitalId) => {
  await getPatientById(patientId, hospitalId);
  const result = await query(
    `SELECT a.id, a.appointment_number, a.appointment_date,
            a.start_time, a.appointment_type, a.status, a.payment_status,
            a.consultation_fee, a.chief_complaint,
            u.first_name as doctor_first_name,
            u.last_name as doctor_last_name,
            d.specialization
     FROM public.appointments a
     JOIN public.doctors d ON a.doctor_id = d.id
     JOIN public.users u ON d.user_id = u.id
     WHERE a.patient_id = $1 AND a.hospital_id = $2
     ORDER BY a.appointment_date DESC, a.start_time DESC`,
    [patientId, hospitalId]
  );
  return result.rows;
};

module.exports = { getAllPatients, getPatientById, createPatient, getPatientHistory };