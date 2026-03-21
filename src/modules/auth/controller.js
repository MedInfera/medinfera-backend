// Auth controller — receives request, calls service, sends response
const authService = require('./service');
const { registerSchema, loginSchema, refreshSchema } = require('./validator');
const { success, error } = require('../../shared/response');

// POST /api/auth/register
const register = async (req, res, next) => {
  try {
    const data = registerSchema.parse(req.body);
    const result = await authService.register(data);
    return success(res, result, 'Registration successful', 201);
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/login
const login = async (req, res, next) => {
  try {
    const data = loginSchema.parse(req.body);
    const result = await authService.login(data);
    return success(res, result, 'Login successful');
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/refresh
const refresh = async (req, res, next) => {
  try {
    const data = refreshSchema.parse(req.body);
    const result = await authService.refresh(data);
    return success(res, result, 'Token refreshed');
  } catch (err) {
    next(err);
  }
};

// GET /api/auth/me
const getMe = async (req, res, next) => {
  try {
    const user = await authService.getMe(req.user.id);
    return success(res, user, 'Profile fetched');
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/logout
const logout = async (req, res, next) => {
  try {
    // Stateless JWT — client just deletes the token
    // In future we can add token blacklisting with Redis here
    return success(res, null, 'Logged out successfully');
  } catch (err) {
    next(err);
  }
};

module.exports = { register, login, refresh, getMe, logout };