const AppError = require('../utils/AppError');

/**
 * Validate req.body, req.params, or req.query against a Joi schema
 * Usage: validate(schema) or validate(schema, 'params')
 */
const validate = (schema, target = 'body') => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[target], {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const errors = error.details.map((d) => ({
        field: d.path.join('.'),
        message: d.message.replace(/['"]/g, ''),
      }));
      return next(AppError.badRequest('Validation failed', errors));
    }

    req[target] = value;
    next();
  };
};

module.exports = { validate };
