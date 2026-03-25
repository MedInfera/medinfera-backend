const bcrypt = require('bcryptjs');
const prisma = require('../../config/database');
const { generateTokenPair, verifyRefreshToken, hashToken } = require('../../utils/tokenService');
const AppError = require('../../utils/AppError');
const { audit } = require('../../utils/auditLogger');
const config = require('../../config');

// ================= LOGIN =================
const login = async ({ email, password }, meta = {}) => {
  const user = await prisma.user.findFirst({
    where: { email: email.toLowerCase(), isActive: true, deletedAt: null },
    include: {
      hospital: { select: { id: true, name: true, isActive: true, subscriptionPlan: true } },
    },
  });

  if (!user) throw AppError.unauthorized('Invalid email or password');

  if (user.role !== 'SUPER_ADMIN' && user.hospital && !user.hospital.isActive) {
    throw AppError.forbidden('Hospital account is inactive');
  }

  const isMatch = await bcrypt.compare(password, user.passwordHash);
  if (!isMatch) throw AppError.unauthorized('Invalid email or password');

  const { accessToken, refreshToken } = generateTokenPair(user);

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(refreshToken),
      userAgent: meta.userAgent || null,
      ipAddress: meta.ip || null,
      expiresAt,
    },
  });

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  await audit({
    hospitalId: user.hospitalId,
    userId: user.id,
    action: 'USER_LOGIN',
    entityType: 'users',
    entityId: user.id,
    req: meta.req,
  });

  return {
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
      hospitalId: user.hospitalId,
      hospital: user.hospital,
      mustResetPassword: user.mustResetPassword,
    },
  };
};

// ================= REFRESH TOKENS =================
const refreshTokens = async (token) => {
  if (!token) throw AppError.badRequest('Refresh token is required');

  let decoded;
  try {
    decoded = verifyRefreshToken(token);
  } catch {
    throw AppError.unauthorized('Invalid or expired refresh token');
  }

  const tokenHash = hashToken(token);

  const stored = await prisma.refreshToken.findUnique({
    where: { tokenHash },
  });

  if (!stored || stored.revokedAt || new Date() > stored.expiresAt) {
    throw AppError.unauthorized('Refresh token is invalid or expired');
  }

  const user = await prisma.user.findFirst({
    where: { id: decoded.userId, isActive: true, deletedAt: null },
  });

  if (!user) throw AppError.unauthorized('User not found');

  // revoke old token
  await prisma.refreshToken.update({
    where: { id: stored.id },
    data: { revokedAt: new Date() },
  });

  const { accessToken, refreshToken: newRefreshToken } = generateTokenPair(user);

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(newRefreshToken),
      userAgent: stored.userAgent,
      ipAddress: stored.ipAddress,
      expiresAt,
    },
  });

  return { accessToken, refreshToken: newRefreshToken };
};

// ================= LOGOUT =================
const logout = async (token) => {
  if (!token) {
    throw AppError.badRequest('Refresh token is required');
  }

  const tokenHash = hashToken(token);

  const result = await prisma.refreshToken.updateMany({
    where: { tokenHash, revokedAt: null },
    data: { revokedAt: new Date() },
  });

  if (result.count === 0) {
    throw AppError.unauthorized('Invalid refresh token');
  }

  return true;
};

// ================= CHANGE PASSWORD =================
const changePassword = async (userId, { currentPassword, newPassword }, req) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw AppError.notFound('User not found');

  const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!isMatch) throw AppError.badRequest('Current password is incorrect');

  const passwordHash = await bcrypt.hash(newPassword, config.bcrypt.rounds);

  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash, mustResetPassword: false },
  });

  await prisma.refreshToken.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });

  await audit({
    userId,
    hospitalId: user.hospitalId,
    action: 'PASSWORD_CHANGED',
    entityType: 'users',
    entityId: userId,
    req,
  });
};

// ================= GET ME =================
const getMe = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      phone: true,
      role: true,
      firstName: true,
      lastName: true,
      avatarUrl: true,
      hospitalId: true,
      employeeCode: true,
      department: true,
      isEmailVerified: true,
      lastLoginAt: true,
      createdAt: true,
      hospital: {
        select: { id: true, name: true, code: true, logoUrl: true, subscriptionPlan: true },
      },
      doctorProfile: {
        select: { id: true, specialization: true, consultationFee: true, isAvailable: true },
      },
    },
  });

  if (!user) throw AppError.notFound('User not found');
  return user;
};

module.exports = { login, refreshTokens, logout, changePassword, getMe };