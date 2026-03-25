const bcrypt = require('bcryptjs');
const prisma = require('../../config/database');
const AppError = require('../../utils/AppError');
const { getPagination, paginationMeta } = require('../../utils/pagination');
const { audit } = require('../../utils/auditLogger');
const config = require('../../config');

const create = async (data, actor) => {
  // Determine hospital context
  const hospitalId = actor.role === 'SUPER_ADMIN'
    ? (data.hospitalId || null)
    : actor.hospitalId;

  // SUPER_ADMIN has no hospitalId — enforce for all other roles
  if (data.role !== 'SUPER_ADMIN' && !hospitalId) {
    throw AppError.badRequest('hospitalId is required for non-platform users');
  }

  // Prevent non-SUPER_ADMIN from creating SUPER_ADMIN
  if (data.role === 'SUPER_ADMIN' && actor.role !== 'SUPER_ADMIN') {
    throw AppError.forbidden('Cannot create SUPER_ADMIN users');
  }

  const existing = await prisma.user.findFirst({
    where: { email: data.email, hospitalId: hospitalId ?? null, deletedAt: null },
  });
  if (existing) throw AppError.conflict('Email already registered in this hospital');

  const passwordHash = await bcrypt.hash(data.password, config.bcrypt.rounds);

  const user = await prisma.user.create({
    data: {
      email: data.email,
      phone: data.phone,
      passwordHash,
      role: data.role,
      firstName: data.firstName,
      lastName: data.lastName,
      employeeCode: data.employeeCode,
      department: data.department,
      hospitalId,
      createdById: actor.id,
      mustResetPassword: true,
    },
    select: {
      id: true, email: true, role: true, firstName: true, lastName: true,
      hospitalId: true, employeeCode: true, department: true, createdAt: true,
    },
  });

  await audit({
    hospitalId, userId: actor.id,
    action: 'USER_CREATED', entityType: 'users', entityId: user.id,
    newValues: { email: user.email, role: user.role },
  });

  return user;
};

const findAll = async (query, actor) => {
  const { page, limit, skip, take } = getPagination(query);

  const where = { deletedAt: null };

  // Scope to hospital unless SUPER_ADMIN
  if (actor.role !== 'SUPER_ADMIN') {
    where.hospitalId = actor.hospitalId;
  } else if (query.hospitalId) {
    where.hospitalId = query.hospitalId;
  }

  if (query.role) where.role = query.role;
  if (query.isActive !== undefined) where.isActive = query.isActive === 'true';
  if (query.department) where.department = { contains: query.department, mode: 'insensitive' };
  if (query.search) {
    where.OR = [
      { firstName: { contains: query.search, mode: 'insensitive' } },
      { lastName: { contains: query.search, mode: 'insensitive' } },
      { email: { contains: query.search, mode: 'insensitive' } },
      { employeeCode: { contains: query.search, mode: 'insensitive' } },
    ];
  }

  const [data, total] = await Promise.all([
    prisma.user.findMany({
      where, skip, take,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, email: true, phone: true, role: true, firstName: true, lastName: true,
        employeeCode: true, department: true, isActive: true, lastLoginAt: true, createdAt: true,
        doctorProfile: { select: { id: true, specialization: true } },
      },
    }),
    prisma.user.count({ where }),
  ]);

  return { data, pagination: paginationMeta(total, page, limit) };
};

const findById = async (id, actor) => {
  const user = await prisma.user.findFirst({
    where: { id, deletedAt: null },
    select: {
      id: true, email: true, phone: true, role: true, firstName: true, lastName: true,
      avatarUrl: true, employeeCode: true, department: true, isActive: true,
      isEmailVerified: true, lastLoginAt: true, hospitalId: true, createdAt: true,
      doctorProfile: true,
    },
  });

  if (!user) throw AppError.notFound('User not found');

  // Hospital-scoped users can only see their own hospital's users
  if (actor.role !== 'SUPER_ADMIN' && user.hospitalId !== actor.hospitalId) {
    throw AppError.forbidden('Access denied');
  }

  return user;
};

const update = async (id, data, actor, req) => {
  const user = await findById(id, actor);

  const updated = await prisma.user.update({
    where: { id },
    data,
    select: {
      id: true, email: true, role: true, firstName: true, lastName: true,
      isActive: true, updatedAt: true,
    },
  });

  await audit({
    hospitalId: user.hospitalId, userId: actor.id,
    action: 'USER_UPDATED', entityType: 'users', entityId: id,
    oldValues: user, newValues: data, req,
  });

  return updated;
};

const resetPassword = async (id, { newPassword, mustResetPassword }, actor, req) => {
  const user = await findById(id, actor);

  const passwordHash = await bcrypt.hash(newPassword, config.bcrypt.rounds);

  await prisma.user.update({
    where: { id },
    data: { passwordHash, mustResetPassword },
  });

  // Revoke all tokens
  await prisma.refreshToken.updateMany({
    where: { userId: id, revokedAt: null },
    data: { revokedAt: new Date() },
  });

  await audit({
    hospitalId: user.hospitalId, userId: actor.id,
    action: 'USER_PASSWORD_RESET', entityType: 'users', entityId: id, req,
  });
};

const softDelete = async (id, actor, req) => {
  const user = await findById(id, actor);
  if (id === actor.id) throw AppError.badRequest('Cannot delete your own account');

  await prisma.user.update({
    where: { id },
    data: { deletedAt: new Date(), isActive: false },
  });

  await audit({
    hospitalId: user.hospitalId, userId: actor.id,
    action: 'USER_DELETED', entityType: 'users', entityId: id, req,
  });
};

module.exports = { create, findAll, findById, update, resetPassword, softDelete };
