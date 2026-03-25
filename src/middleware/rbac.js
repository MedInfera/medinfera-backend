const AppError = require('../utils/AppError');

/**
 * Allow only specified roles
 * Usage: authorize('ADMIN', 'SUPER_ADMIN')
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) return next(AppError.unauthorized());
    if (!roles.includes(req.user.role)) {
      return next(AppError.forbidden(`Role '${req.user.role}' is not permitted to perform this action`));
    }
    next();
  };
};

/**
 * Ensure the user belongs to the hospital in the route params/body
 * SUPER_ADMIN bypasses this check
 */
const requireHospitalAccess = (req, res, next) => {
  if (!req.user) return next(AppError.unauthorized());

  if (req.user.role === 'SUPER_ADMIN') return next();

  const hospitalId =
    req.params.hospitalId ||
    req.body.hospitalId ||
    req.query.hospitalId ||
    req.user.hospitalId;

  if (!hospitalId) return next(AppError.badRequest('Hospital context is required'));

  if (req.user.hospitalId !== hospitalId) {
    return next(AppError.forbidden('Access denied to this hospital'));
  }

  // Attach resolved hospitalId to request for convenience
  req.hospitalId = hospitalId;
  next();
};

/**
 * Inject hospitalId from authenticated user into req
 * For routes that don't take hospitalId as a param
 */
const injectHospitalId = (req, res, next) => {
  if (!req.user) return next(AppError.unauthorized());

  if (req.user.role === 'SUPER_ADMIN') {
    // SUPER_ADMIN must explicitly pass hospitalId
    req.hospitalId = req.params.hospitalId || req.query.hospitalId || req.body.hospitalId || null;
  } else {
    req.hospitalId = req.user.hospitalId;
  }

  next();
};

/**
 * Roles reference for use across the app
 */
const ROLES = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  ADMIN: 'ADMIN',
  DOCTOR: 'DOCTOR',
  RECEPTIONIST: 'RECEPTIONIST',
  NURSE: 'NURSE',
  PHARMACIST: 'PHARMACIST',
  LAB_TECHNICIAN: 'LAB_TECHNICIAN',
  BILLING: 'BILLING',
  PATIENT: 'PATIENT',
  DRIVER: 'DRIVER',
  STAFF: 'STAFF',
};

const STAFF_ROLES = [
  ROLES.SUPER_ADMIN,
  ROLES.ADMIN,
  ROLES.DOCTOR,
  ROLES.RECEPTIONIST,
  ROLES.NURSE,
  ROLES.PHARMACIST,
  ROLES.LAB_TECHNICIAN,
  ROLES.BILLING,
  ROLES.DRIVER,
  ROLES.STAFF,
];

module.exports = { authorize, requireHospitalAccess, injectHospitalId, ROLES, STAFF_ROLES };
