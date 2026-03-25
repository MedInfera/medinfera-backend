const prisma = require('../../config/database');
const AppError = require('../../utils/AppError');
const { getPagination, paginationMeta } = require('../../utils/pagination');

// ─── Wards ────────────────────────────────────────────────────────────────────

const createWard = async (data, actor) => {
  return prisma.ward.create({
    data: { ...data, hospitalId: actor.hospitalId },
  });
};

const getWards = async (actor) => {
  return prisma.ward.findMany({
    where: { hospitalId: actor.hospitalId, isActive: true },
    include: {
      beds: { select: { status: true } },
    },
    orderBy: { name: 'asc' },
  });
};

const getWardById = async (id, actor) => {
  const ward = await prisma.ward.findFirst({
    where: { id, hospitalId: actor.hospitalId },
    include: {
      beds: true,
    },
  });
  if (!ward) throw AppError.notFound('Ward not found');
  return ward;
};

const updateWard = async (id, data, actor) => {
  await getWardById(id, actor);
  return prisma.ward.update({ where: { id }, data });
};

// ─── Beds ─────────────────────────────────────────────────────────────────────

const createBed = async (data, actor) => {
  const ward = await prisma.ward.findFirst({
    where: { id: data.wardId, hospitalId: actor.hospitalId },
  });
  if (!ward) throw AppError.notFound('Ward not found in this hospital');

  const bed = await prisma.bed.create({
    data: { ...data, hospitalId: actor.hospitalId },
    include: { ward: { select: { name: true, wardType: true } } },
  });

  // Increment ward total beds count
  await prisma.ward.update({
    where: { id: data.wardId },
    data: { totalBeds: { increment: 1 } },
  });

  return bed;
};

const getBeds = async (query, actor) => {
  const { page, limit, skip, take } = getPagination(query);
  const where = { hospitalId: actor.hospitalId };

  if (query.wardId) where.wardId = query.wardId;
  if (query.status) where.status = query.status;
  if (query.bedType) where.bedType = query.bedType;

  const [data, total] = await Promise.all([
    prisma.bed.findMany({
      where,
      skip,
      take,
      include: {
        ward: { select: { name: true, wardType: true, floor: true } },
        ipdAdmissions: {
          where: { status: { notIn: ['DISCHARGED', 'DECEASED', 'TRANSFERRED'] } },
          select: {
            id: true,
            admissionDate: true,
            status: true,
            patient: { select: { firstName: true, lastName: true, patientCode: true } },
          },
          take: 1,
        },
      },
      orderBy: [{ ward: { name: 'asc' } }, { bedNumber: 'asc' }],
    }),
    prisma.bed.count({ where }),
  ]);

  return { data, pagination: paginationMeta(total, page, limit) };
};

const getBedById = async (id, actor) => {
  const bed = await prisma.bed.findFirst({
    where: { id, hospitalId: actor.hospitalId },
    include: {
      ward: true,
      ipdAdmissions: {
        where: { status: { notIn: ['DISCHARGED', 'DECEASED', 'TRANSFERRED'] } },
        include: {
          patient: { select: { firstName: true, lastName: true, patientCode: true, bloodGroup: true } },
          primaryDoctor: { include: { user: { select: { firstName: true, lastName: true } } } },
        },
        take: 1,
      },
    },
  });
  if (!bed) throw AppError.notFound('Bed not found');
  return bed;
};

const updateBedStatus = async (id, status, actor) => {
  const bed = await getBedById(id, actor);

  // Cannot manually mark as OCCUPIED — that happens on admission
  if (status === 'OCCUPIED') {
    throw AppError.badRequest('Bed status OCCUPIED is set automatically on patient admission');
  }

  // Cannot change an occupied bed manually
  if (bed.status === 'OCCUPIED' && status !== 'MAINTENANCE') {
    throw AppError.badRequest('Cannot change status of an occupied bed. Discharge the patient first.');
  }

  return prisma.bed.update({
    where: { id },
    data: { status },
    include: { ward: { select: { name: true } } },
  });
};

// ─── Stats ────────────────────────────────────────────────────────────────────

const getOccupancyStats = async (actor) => {
  const wards = await prisma.ward.findMany({
    where: { hospitalId: actor.hospitalId, isActive: true },
    include: {
      beds: { select: { status: true, bedType: true } },
    },
    orderBy: { name: 'asc' },
  });

  const summary = wards.map((ward) => {
    const beds = ward.beds;
    return {
      wardId: ward.id,
      wardName: ward.name,
      wardType: ward.wardType,
      floor: ward.floor,
      totalBeds: beds.length,
      available: beds.filter((b) => b.status === 'AVAILABLE').length,
      occupied: beds.filter((b) => b.status === 'OCCUPIED').length,
      reserved: beds.filter((b) => b.status === 'RESERVED').length,
      maintenance: beds.filter((b) => b.status === 'MAINTENANCE').length,
      blocked: beds.filter((b) => b.status === 'BLOCKED').length,
      occupancyRate:
        beds.length > 0
          ? Math.round((beds.filter((b) => b.status === 'OCCUPIED').length / beds.length) * 100)
          : 0,
    };
  });

  const totals = summary.reduce(
    (acc, w) => {
      acc.totalBeds += w.totalBeds;
      acc.available += w.available;
      acc.occupied += w.occupied;
      return acc;
    },
    { totalBeds: 0, available: 0, occupied: 0 }
  );

  return {
    totals: {
      ...totals,
      occupancyRate:
        totals.totalBeds > 0 ? Math.round((totals.occupied / totals.totalBeds) * 100) : 0,
    },
    byWard: summary,
  };
};

module.exports = {
  createWard,
  getWards,
  getWardById,
  updateWard,
  createBed,
  getBeds,
  getBedById,
  updateBedStatus,
  getOccupancyStats,
};
