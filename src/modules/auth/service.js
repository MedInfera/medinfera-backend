// Auth business logic — all database queries and token generation live here
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../../config/db');
const env = require('../../config/env');

// Generate access token (short lived — 15 minutes)
const generateAccessToken = (user) => {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      roleId: user.role_id,
      roleName: user.role_name,
      hospitalId: user.hospital_id,
    },
    env.jwt.secret,
    { expiresIn: env.jwt.expiresIn }
  );
};

// Generate refresh token (long lived — 7 days)
const generateRefreshToken = (user) => {
  return jwt.sign(
    { id: user.id },
    env.jwt.refreshSecret,
    { expiresIn: env.jwt.refreshExpiresIn }
  );
};

// Register a new user
const register = async (data) => {
  const { first_name, last_name, email, password, phone, role_id, hospital_id } = data;

  // Check if email already exists in this hospital
  const existing = await query(
    'SELECT id FROM public.users WHERE email = $1 AND hospital_id = $2',
    [email, hospital_id || null]
  );
  if (existing.rows.length > 0) {
    const err = new Error('Email already registered');
    err.statusCode = 409;
    throw err;
  }

  // Get role name for the token
  const roleResult = await query('SELECT name FROM public.roles WHERE id = $1', [role_id]);
  if (roleResult.rows.length === 0) {
    const err = new Error('Invalid role');
    err.statusCode = 400;
    throw err;
  }

  // Hash the password — never store plain text
  const password_hash = await bcrypt.hash(password, 12);

  // Insert new user
  const result = await query(
    `INSERT INTO public.users 
      (first_name, last_name, email, password_hash, phone, role_id, hospital_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id, uuid, first_name, last_name, email, phone, role_id, hospital_id, created_at`,
    [first_name, last_name, email, password_hash, phone, role_id, hospital_id || null]
  );

  const newUser = result.rows[0];
  newUser.role_name = roleResult.rows[0].name;

  const accessToken = generateAccessToken(newUser);
  const refreshToken = generateRefreshToken(newUser);

  return {
    user: {
      id: newUser.id,
      uuid: newUser.uuid,
      first_name: newUser.first_name,
      last_name: newUser.last_name,
      email: newUser.email,
      phone: newUser.phone,
      role: newUser.role_name,
      hospital_id: newUser.hospital_id,
    },
    access_token: accessToken,
    refresh_token: refreshToken,
  };
};

// Login with email and password
const login = async ({ email, password }) => {
  // Find user and join with roles table to get role name
  const result = await query(
    `SELECT u.*, r.name as role_name 
     FROM public.users u
     JOIN public.roles r ON u.role_id = r.id
     WHERE u.email = $1 AND u.is_active = true AND u.deleted_at IS NULL`,
    [email]
  );

  if (result.rows.length === 0) {
    const err = new Error('Invalid email or password');
    err.statusCode = 401;
    throw err;
  }

  const user = result.rows[0];

  // Compare password with stored hash
  const isMatch = await bcrypt.compare(password, user.password_hash);
  if (!isMatch) {
    const err = new Error('Invalid email or password');
    err.statusCode = 401;
    throw err;
  }

  // Update last login time
  await query(
    'UPDATE public.users SET last_login_at = NOW() WHERE id = $1',
    [user.id]
  );

  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);

  return {
    user: {
      id: user.id,
      uuid: user.uuid,
      first_name: user.first_name,
      last_name: user.last_name,
      email: user.email,
      phone: user.phone,
      role: user.role_name,
      hospital_id: user.hospital_id,
    },
    access_token: accessToken,
    refresh_token: refreshToken,
  };
};

// Issue new access token using refresh token
const refresh = async ({ refresh_token }) => {
  let decoded;
  try {
    decoded = jwt.verify(refresh_token, env.jwt.refreshSecret);
  } catch {
    const err = new Error('Invalid or expired refresh token');
    err.statusCode = 401;
    throw err;
  }

  // Get latest user data (in case role or hospital changed)
  const result = await query(
    `SELECT u.*, r.name as role_name 
     FROM public.users u
     JOIN public.roles r ON u.role_id = r.id
     WHERE u.id = $1 AND u.is_active = true`,
    [decoded.id]
  );

  if (result.rows.length === 0) {
    const err = new Error('User not found');
    err.statusCode = 401;
    throw err;
  }

  const user = result.rows[0];
  const accessToken = generateAccessToken(user);

  return { access_token: accessToken };
};

// Get current logged in user profile
const getMe = async (userId) => {
  const result = await query(
    `SELECT u.id, u.uuid, u.first_name, u.last_name, u.email, u.phone,
            u.profile_photo, u.hospital_id, u.created_at, r.name as role
     FROM public.users u
     JOIN public.roles r ON u.role_id = r.id
     WHERE u.id = $1 AND u.is_active = true`,
    [userId]
  );

  if (result.rows.length === 0) {
    const err = new Error('User not found');
    err.statusCode = 404;
    throw err;
  }

  return result.rows[0];
};

module.exports = { register, login, refresh, getMe };