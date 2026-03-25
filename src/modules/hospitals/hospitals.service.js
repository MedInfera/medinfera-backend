const prisma = require('../../config/database');
const AppError = require('../../utils/AppError');
const { getPagination, paginationMeta } = require('../../utils/pagination');
const { audit } = require('../../utils/auditLogger');

const create = async (data, actorId) => {
  const existing = await prisma.hospital.findFirst({
    where: { OR: [{ code: data.code }, { slug: data.slug }] },
  });
  if (existing) throw AppError.conflict('Hospital code or slug already exists');

  const hospital = await prisma.hospital.create({ data });

  await audit({ userId: actorId, action: 'HOSPITAL_CREATED', entityType: 'hospitals', entityId: hospital.id });
  return hospital;
};

const findAll = async (query) => {
  const { page, limit, skip, take } = getPagination(query);
  const where = { deletedAt: null };

  if (query.search) {
    where.OR = [
      { name: { contains: query.search, mode: 'insensitive' } },
      { city: { contains: query.search, mode: 'insensitive' } },
      { code: { contains: query.search, mode: 'insensitive' } },
    ];
  }
  if (query.isActive !== undefined) where.isActive = query.isActive === 'true';
  if (query.subscriptionPlan) where.subscriptionPlan = query.subscriptionPlan;

  const [data, total] = await Promise.all([
    prisma.hospital.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, name: true, code: true, slug: true, city: true, state: true,
        phone: true, email: true, isActive: true, subscriptionPlan: true,
        subscriptionExpiresAt: true, createdAt: true,
        _count: { select: { users: true, patientProfiles: true } },
      },
    }),
    prisma.hospital.count({ where }),
  ]);

  return { data, pagination: paginationMeta(total, page, limit) };
};

const findById = async (id) => {
  const hospital = await prisma.hospital.findFirst({
    where: { id, deletedAt: null },
  });
  if (!hospital) throw AppError.notFound('Hospital not found');
  return hospital;
};

const update = async (id, data, actorId, req) => {
  const hospital = await findById(id);

  const updated = await prisma.hospital.update({
    where: { id },
    data,
  });

  await audit({
    hospitalId: id, userId: actorId,
    action: 'HOSPITAL_UPDATED', entityType: 'hospitals', entityId: id,
    oldValues: hospital, newValues: data, req,
  });

  return updated;
};

const softDelete = async (id, actorId, req) => {
  await findById(id);
  await prisma.hospital.update({
    where: { id },
    data: { deletedAt: new Date(), isActive: false },
  });
  await audit({ userId: actorId, action: 'HOSPITAL_DELETED', entityType: 'hospitals', entityId: id, req });
};

const getStats = async (id) => {
  await findById(id);
  const [users, patients, appointments, admissions, invoices] = await Promise.all([
    prisma.user.count({ where: { hospitalId: id, isActive: true, deletedAt: null } }),
    prisma.patientProfile.count({ where: { hospitalId: id, isActive: true, deletedAt: null } }),
    prisma.appointment.count({ where: { hospitalId: id } }),
    prisma.ipdAdmission.count({ where: { hospitalId: id, status: { notIn: ['DISCHARGED', 'DECEASED', 'TRANSFERRED'] } } }),
    prisma.invoice.aggregate({ where: { hospitalId: id }, _sum: { totalAmount: true, paidAmount: true } }),
  ]);

  return {
    users, patients, appointments,
    activeAdmissions: admissions,
    revenue: {
      total: invoices._sum.totalAmount || 0,
      collected: invoices._sum.paidAmount || 0,
    },
  };
};

module.exports = { create, findAll, findById, update, softDelete, getStats };
