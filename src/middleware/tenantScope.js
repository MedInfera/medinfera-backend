// Prevent users from accessing other hospitals' data
// SUPER_ADMIN bypasses this and can access everything
const { error } = require('../shared/response');

const tenantScope = (req, res, next) => {
  if (!req.user) return error(res, 'Unauthorized', 401);

  if (req.user.roleName === 'SUPER_ADMIN') return next();

  if (!req.user.hospitalId) {
    return error(res, 'No hospital associated with this account', 403);
  }

  req.hospitalId = req.user.hospitalId;
  next();
};

module.exports = { tenantScope };