// Hospital service — Super Admin manages all hospitals
const { query } = require('../../config/db');
const { getPagination } = require('../../shared/paginate');

// Get all hospitals with pagination and search
const getAllHospitals = async (queryParams) => {
  const { page, limit, offset } = getPagination(queryParams);
  const search = queryParams.search || '';

  const result = await query(
    `SELECT id, uuid, name, email, phone, city, state, 
            subscription_plan, is_active, created_at
     FROM public.hospitals
     WHERE deleted_at IS NULL
       AND (name ILIKE $1 OR email ILIKE $1 OR city ILIKE $1)
     ORDER BY created_at DESC
     LIMIT $2 OFFSET $3`,
    [`%${search}%`, limit, offset]
  );

  const countResult = await query(
    `SELECT COUNT(*) FROM public.hospitals 
     WHERE deleted_at IS NULL AND (name ILIKE $1 OR email ILIKE $1)`,
    [`%${search}%`]
  );

  return {
    hospitals: result.rows,
    total: parseInt(countResult.rows[0].count),
    page,
    limit,
  };
};

// Get single hospital by ID
const getHospitalById = async (id) => {
  const result = await query(
    `SELECT * FROM public.hospitals WHERE id = $1 AND deleted_at IS NULL`,
    [id]
  );
  if (result.rows.length === 0) {
    const err = new Error('Hospital not found');
    err.statusCode = 404;
    throw err;
  }
  return result.rows[0];
};

// Create a new hospital
const createHospital = async (data) => {
  const {
    name, email, phone, address_line1, address_line2,
    city, state, postal_code, country, registration_number,
    subscription_plan, timezone, currency
  } = data;

  // Check email uniqueness
  const existing = await query(
    'SELECT id FROM public.hospitals WHERE email = $1 AND deleted_at IS NULL',
    [email]
  );
  if (existing.rows.length > 0) {
    const err = new Error('Hospital with this email already exists');
    err.statusCode = 409;
    throw err;
  }

  const result = await query(
    `INSERT INTO public.hospitals
      (name, email, phone, address_line1, address_line2, city, state,
       postal_code, country, registration_number, subscription_plan, timezone, currency)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
     RETURNING *`,
    [name, email, phone, address_line1, address_line2 || null,
     city, state, postal_code, country || 'India',
     registration_number || null, subscription_plan || 'BASIC',
     timezone || 'Asia/Kolkata', currency || 'INR']
  );

  return result.rows[0];
};

// Update hospital details
const updateHospital = async (id, data) => {
  // First check hospital exists
  await getHospitalById(id);

  const fields = [];
  const values = [];
  let counter = 1;

  // Dynamically build update query from provided fields
  const allowed = ['name', 'email', 'phone', 'address_line1', 'address_line2',
    'city', 'state', 'postal_code', 'country', 'subscription_plan',
    'timezone', 'currency', 'is_active'];

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
  values.push(id);

  const result = await query(
    `UPDATE public.hospitals SET ${fields.join(', ')} 
     WHERE id = $${counter} AND deleted_at IS NULL
     RETURNING *`,
    values
  );

  return result.rows[0];
};

// Soft delete a hospital
const deleteHospital = async (id) => {
  await getHospitalById(id);
  await query(
    `UPDATE public.hospitals SET deleted_at = NOW() WHERE id = $1`,
    [id]
  );
  return { message: 'Hospital deleted successfully' };
};

// Toggle hospital active/inactive
const toggleHospitalStatus = async (id) => {
  const hospital = await getHospitalById(id);
  const newStatus = !hospital.is_active;
  const result = await query(
    `UPDATE public.hospitals SET is_active = $1, updated_at = NOW() 
     WHERE id = $2 RETURNING id, name, is_active`,
    [newStatus, id]
  );
  return result.rows[0];
};

// Get hospital stats for super admin dashboard
const getHospitalStats = async () => {
  const result = await query(`
    SELECT 
      COUNT(*) as total_hospitals,
      COUNT(*) FILTER (WHERE is_active = true) as active_hospitals,
      COUNT(*) FILTER (WHERE subscription_plan = 'BASIC') as basic_plan,
      COUNT(*) FILTER (WHERE subscription_plan = 'PROFESSIONAL') as professional_plan,
      COUNT(*) FILTER (WHERE subscription_plan = 'ENTERPRISE') as enterprise_plan
    FROM public.hospitals 
    WHERE deleted_at IS NULL
  `);
  return result.rows[0];
};

module.exports = {
  getAllHospitals, getHospitalById, createHospital,
  updateHospital, deleteHospital, toggleHospitalStatus,
  getHospitalStats
};