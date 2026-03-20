// Verify JWT on every protected route
// Attaches decoded user info to req.user for use in controllers
const jwt = require('jsonwebtoken');
const env = require('../config/env');
const { error } = require('../shared/response');

const authenticate = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return error(res, 'No token provided', 401);
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, env.jwt.secret);

    req.user = {
      id: decoded.id,
      hospitalId: decoded.hospitalId,
      roleId: decoded.roleId,
      roleName: decoded.roleName,
      email: decoded.email,
    };

    next();
  } catch (err) {
    next(err);
  }
};

module.exports = { authenticate };