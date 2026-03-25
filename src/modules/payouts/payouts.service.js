const prisma = require('../../config/database');
const AppError = require('../../utils/AppError');
const { getPagination, paginationMeta } = require('../../utils/pagination');

// ─── Payroll ──────────────────────────────────────────────────────────────────

const createPayroll = async (data, actor) => {
  const hospitalId = actor.hospitalId;

  // Verify user exists in this hospital
  const user = await prisma.user.findFirst({
    where: { id: data.userId, hospitalId, deletedAt: null },
    select: { id: true, firstName: true, lastName: true, role: true },
  });
  if (!user) throw AppError.notFound('Staff member not found in this hospital');

  // Check for duplicate
  const existing = await prisma.staffPayroll.findFirst({
    where: { userId: data.userId, month: data.month, year: data.year },
  });
  if (existing) throw AppError.conflict(`Payroll already exists for ${data.month}/${data.year}`);

  const netSalary = data.basicSalary + (data.allowances || 0) - (data.deductions || 0);

  return prisma.staffPayroll.create({
    data: {
      hospitalId,
      userId: data.userId,
      month: data.month,
      year: data.year,
      basicSalary: data.basicSalary,
      allowances: data.allowances || 0,
      deductions: data.deductions || 0,
      netSalary,
      notes: data.notes || null,
    },
  });
};

const getPayrolls = async (query, actor) => {
  const { page, limit, skip, take } = getPagination(query);
  const where = { hospitalId: actor.hospitalId };

  if (query.month) where.month = parseInt(query.month);
  if (query.year) where.year = parseInt(query.year);
  if (query.status) where.status = query.status;
  if (query.userId) where.userId = query.userId;

  const [data, total] = await Promise.all([
    prisma.staffPayroll.findMany({
      where,
      skip,
      take,
      include: {
        payouts: { select: { id: true, type: true, amount: true, status: true } },
      },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
    }),
    prisma.staffPayroll.count({ where }),
  ]);

  return { data, pagination: paginationMeta(total, page, limit) };
};

const getPayrollById = async (id, actor) => {
  const payroll = await prisma.staffPayroll.findFirst({
    where: { id, hospitalId: actor.hospitalId },
    include: {
      payouts: true,
    },
  });
  if (!payroll) throw AppError.notFound('Payroll record not found');
  return payroll;
};

const processPayroll = async (id, actor) => {
  const payroll = await getPayrollById(id, actor);

  if (payroll.status !== 'PENDING') {
    throw AppError.badRequest(`Payroll is already ${payroll.status}`);
  }

  const [updated] = await prisma.$transaction([
    prisma.staffPayroll.update({
      where: { id },
      data: {
        status: 'PROCESSING',
        processedBy: actor.id,
        processedAt: new Date(),
      },
    }),
    prisma.payout.create({
      data: {
        hospitalId: actor.hospitalId,
        userId: payroll.userId,
        payrollId: id,
        type: 'SALARY',
        amount: payroll.netSalary,
        status: 'PENDING',
        notes: `Salary for ${payroll.month}/${payroll.year}`,
      },
    }),
  ]);

  return updated;
};

// ─── Payouts ──────────────────────────────────────────────────────────────────

const createPayout = async (data, actor) => {
  const user = await prisma.user.findFirst({
    where: { id: data.userId, hospitalId: actor.hospitalId, deletedAt: null },
  });
  if (!user) throw AppError.notFound('Staff member not found');

  return prisma.payout.create({
    data: { ...data, hospitalId: actor.hospitalId },
  });
};

const getPayouts = async (query, actor) => {
  const { page, limit, skip, take } = getPagination(query);
  const where = { hospitalId: actor.hospitalId };

  if (query.status) where.status = query.status;
  if (query.userId) where.userId = query.userId;
  if (query.type) where.type = query.type;
  if (query.payrollId) where.payrollId = query.payrollId;

  const [data, total] = await Promise.all([
    prisma.payout.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.payout.count({ where }),
  ]);

  return { data, pagination: paginationMeta(total, page, limit) };
};

const getPayoutById = async (id, actor) => {
  const payout = await prisma.payout.findFirst({
    where: { id, hospitalId: actor.hospitalId },
    include: {
      payroll: { select: { month: true, year: true, basicSalary: true, netSalary: true } },
    },
  });
  if (!payout) throw AppError.notFound('Payout not found');
  return payout;
};

const markPayoutPaid = async (id, data, actor) => {
  const payout = await getPayoutById(id, actor);

  if (payout.status === 'PAID') throw AppError.badRequest('Payout is already paid');
  if (payout.status === 'CANCELLED') throw AppError.badRequest('Cannot pay a cancelled payout');

  return prisma.payout.update({
    where: { id },
    data: {
      status: 'PAID',
      paymentMode: data.paymentMode,
      referenceNumber: data.referenceNumber || null,
      notes: data.notes || payout.notes,
      processedBy: actor.id,
      processedAt: new Date(),
    },
  });
};

module.exports = {
  createPayroll,
  getPayrolls,
  getPayrollById,
  processPayroll,
  createPayout,
  getPayouts,
  getPayoutById,
  markPayoutPaid,
};
