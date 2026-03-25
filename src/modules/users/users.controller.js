const service = require('./users.service');
const response = require('../../utils/response');
const asyncHandler = require('../../utils/asyncHandler');

const create = asyncHandler(async (req, res) => {
  const user = await service.create(req.body, req.user);
  response.created(res, user, 'User created successfully');
});

const findAll = asyncHandler(async (req, res) => {
  const { data, pagination } = await service.findAll(req.query, req.user);
  response.paginated(res, data, pagination);
});

const findById = asyncHandler(async (req, res) => {
  const user = await service.findById(req.params.id, req.user);
  response.success(res, user);
});

const update = asyncHandler(async (req, res) => {
  const user = await service.update(req.params.id, req.body, req.user, req);
  response.success(res, user, 'User updated');
});

const resetPassword = asyncHandler(async (req, res) => {
  await service.resetPassword(req.params.id, req.body, req.user, req);
  response.success(res, null, 'Password reset successfully');
});

const remove = asyncHandler(async (req, res) => {
  await service.softDelete(req.params.id, req.user, req);
  response.success(res, null, 'User deleted');
});

module.exports = { create, findAll, findById, update, resetPassword, remove };
