// Global error handler — catches every unhandled error in the app
// Must be the LAST middleware registered in app.js
const { error } = require('../shared/response');

const errorHandler = (err, req, res, next) => {
  console.error('❌', err.message);

  if (err.name === 'ZodError') {
    return error(res, 'Validation failed', 400, err.errors);
  }
  if (err.name === 'JsonWebTokenError') {
    return error(res, 'Invalid token', 401);
  }
  if (err.name === 'TokenExpiredError') {
    return error(res, 'Token expired — please login again', 401);
  }
  if (err.code === '23505') {
    return error(res, 'Record already exists', 409);
  }
  if (err.code === '23503') {
    return error(res, 'Referenced record does not exist', 400);
  }

  return error(res, err.message || 'Internal server error', err.statusCode || 500);
};

module.exports = errorHandler;