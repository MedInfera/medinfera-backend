const { verifyAccessToken } = require('../utils/tokenService');
const AppError = require('../utils/AppError');
const prisma = require('../config/database');

/**
 * Protect routes — verifies JWT and attaches req.user
 */
const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw AppError.unauthorized('No token provided');
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyAccessToken(token);

    // Fetch fresh user (handles deactivation mid-session)
    const user = await prisma.user.findFirst({
      where: {
        id: decoded.userId,
        isActive: true,
        deletedAt: null,
      },
      select: {
        id: true,
        hospitalId: true,
        email: true,
        role: true,
        firstName: true,
        lastName: true,
        isActive: true,
        mustResetPassword: true,
      },
    });

    if (!user) {
      throw AppError.unauthorized('User no longer active');
    }

    /**
     * 🔥 FIX: Allow change-password route even if mustResetPassword = true
     */
    const isPasswordChangeRoute =
      req.originalUrl.includes('/auth/change-password');

    if (user.mustResetPassword && !isPasswordChangeRoute) {
      throw AppError.forbidden('Password reset required before proceeding');
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'JsonWebTokenError') {
      return next(AppError.unauthorized('Invalid token'));
    }
    if (err.name === 'TokenExpiredError') {
      return next(AppError.unauthorized('Token expired'));
    }
    next(err);
  }
};

/**
 * Optional auth — attaches user if token present
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyAccessToken(token);

    const user = await prisma.user.findFirst({
      where: {
        id: decoded.userId,
        isActive: true,
        deletedAt: null,
      },
      select: {
        id: true,
        hospitalId: true,
        email: true,
        role: true,
      },
    });

    if (user) req.user = user;

    next();
  } catch {
    next();
  }
};

module.exports = { protect, optionalAuth };