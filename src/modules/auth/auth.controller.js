const authService = require('./auth.service');
const response = require('../../utils/response');
const asyncHandler = require('../../utils/asyncHandler');

const login = asyncHandler(async (req, res) => {
  const result = await authService.login(req.body, {
    ip: req.ip,
    userAgent: req.headers['user-agent'],
    req,
  });
  response.success(res, result, 'Login successful');
});

const refresh = asyncHandler(async (req, res) => {
  const result = await authService.refreshTokens(req.body.refreshToken);
  response.success(res, result, 'Tokens refreshed');
});

const logout = asyncHandler(async (req, res) => {
  await authService.logout(req.body.refreshToken);
  response.success(res, null, 'Logged out successfully');
});

const changePassword = asyncHandler(async (req, res) => {
  await authService.changePassword(req.user.id, req.body, req);
  response.success(res, null, 'Password changed successfully');
});

const getMe = asyncHandler(async (req, res) => {
  const user = await authService.getMe(req.user.id);
  response.success(res, user);
});

module.exports = { login, refresh, logout, changePassword, getMe };
