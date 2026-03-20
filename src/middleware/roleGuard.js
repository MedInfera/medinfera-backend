// Restrict routes to specific roles
// Usage: router.post('/something', authenticate, roleGuard('ADMIN', 'STAFF'), controller)
const { error } = require('../shared/response');

const roleGuard = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) return error(res, 'Unauthorized', 401);
    if (!allowedRoles.includes(req.user.roleName)) {
      return error(res, 'You do not have permission for this action', 403);
    }
    next();
  };
};

module.exports = { roleGuard };